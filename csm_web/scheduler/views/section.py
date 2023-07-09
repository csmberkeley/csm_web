import datetime

from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import (
    Attendance,
    Course,
    Mentor,
    Section,
    Spacetime,
    Student,
    User,
    WaitlistPosition,
)
from ..serializers import (
    SectionOccurrenceSerializer,
    SectionSerializer,
    SpacetimeSerializer,
    StudentSerializer,
)
from .utils import get_object_or_error, log_str, logger, viewset_with


class SectionViewSet(*viewset_with("retrieve", "partial_update", "create")):
    serializer_class = SectionSerializer

    def get_object(self):
        return get_object_or_error(self.get_queryset(), **self.kwargs)

    def get_queryset(self):
        banned_from = self.request.user.student_set.filter(banned=True).values_list(
            "section__mentor__course__id", flat=True
        )
        return (
            Section.objects.exclude(mentor__course__pk__in=banned_from)
            .prefetch_related(
                Prefetch(
                    "spacetimes",
                    queryset=Spacetime.objects.order_by("day_of_week", "start_time"),
                )
            )
            .filter(
                Q(mentor__user=self.request.user)
                | Q(students__user=self.request.user)
                | Q(mentor__course__coordinator__user=self.request.user)
            )
            .distinct()
        )

    def create(self, request):
        course = get_object_or_error(
            Course.objects.all(),
            pk=request.data["course_id"],
            coordinator__user=self.request.user,
        )
        """
        We have an atomic block here because several different objects must be created in the course of
        creating a single Section. If any of these were to fail, whatever objects we had already created would
        be left 'dangling' so-to-speak, not being attached to other entities in a way consistent with the rest of
        the application's logic. Therefore the atomic block - if any failures are encountered, any objects created
        within the atomic block before the point of failure are rolled back.
        """
        with transaction.atomic():
            mentor_user, _ = User.objects.get_or_create(
                email=self.request.data["mentor_email"],
                username=self.request.data["mentor_email"].split("@")[0],
            )
            mentors_with_sections = course.mentor_set.filter(section__isnull=False)
            if mentors_with_sections.count() > 0:
                duration = (
                    mentors_with_sections.first().section.spacetimes.first().duration
                )
            else:
                duration = datetime.timedelta(hours=1)  # default duration is 1 hour
            spacetime_serializers = [
                SpacetimeSerializer(data={**spacetime, "duration": str(duration)})
                for spacetime in self.request.data["spacetimes"]
            ]
            for spacetime_serializer in spacetime_serializers:
                # Be extra defensive and validate them all first before saving any
                if not spacetime_serializer.is_valid():
                    return Response(
                        {
                            "error": (
                                f"Spacetime was invalid {spacetime_serializer.errors}"
                            )
                        },
                        status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    )
            spacetimes = [
                spacetime_serializer.save()
                for spacetime_serializer in spacetime_serializers
            ]
            mentor = Mentor.objects.create(user=mentor_user, course=course)
            section = Section.objects.create(
                mentor=mentor,
                description=self.request.data["description"],
                capacity=self.request.data["capacity"],
            )
            section.spacetimes.set(spacetimes)
            section.save()
        return Response(status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        section = get_object_or_error(self.get_queryset(), pk=pk)
        if not section.mentor.course.coordinator_set.filter(
            user=self.request.user
        ).count():
            raise PermissionDenied("Only coordinators can change section metadata")
        serializer = self.serializer_class(
            section,
            data={
                "capacity": request.data.get("capacity"),
                "description": request.data.get("description"),
            },
            partial=True,
        )
        if serializer.is_valid():
            section = serializer.save()
            logger.info(
                f"<Section:Meta:Success> Updated metadata on section {log_str(section)}"
            )
            return Response(status=status.HTTP_202_ACCEPTED)
        else:
            logger.info(
                "<Section:Meta:Failure> Failed to update metadata on section"
                f" {log_str(section)}"
            )
            return Response(status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        section = get_object_or_error(self.get_queryset(), pk=pk)
        return Response(
            SectionOccurrenceSerializer(
                section.sectionoccurrence_set.all(), many=True
            ).data
        )

    @action(detail=True, methods=["get", "put"])
    def students(self, request, pk=None):
        if request.method == "GET":
            section = get_object_or_error(self.get_queryset(), pk=pk)
            return Response(
                StudentSerializer(
                    section.students.select_related("user")
                    # , queryset=Attendance.objects.order_by("date")
                    .prefetch_related(Prefetch("attendance_set")).filter(active=True),
                    many=True,
                ).data
            )
        # PUT
        with transaction.atomic():
            """
            We reload the section object for atomicity. Even though we do not update
            the section directly, any student trying to enroll must first acquire a lock on the
            desired section. This allows us to assume that current_student_count is correct.
            """
            section = get_object_or_error(Section.objects, pk=pk)
            section = (
                Section.objects.select_for_update()
                .prefetch_related("mentor__course")
                .get(pk=section.pk)
            )
            is_coordinator = bool(
                section.mentor.course.coordinator_set.filter(user=request.user).count()
            )

            """
            Request format:
            - student add:
                request.user: student that wants to add section
                pk: primary key of section to enroll into

            - coordinator add:
                request.user: coordinator that wants to add students
                pk: primary key of section to enroll into
                request.data['emails']: array of objects with keys:
                    - 'email': email of student
                    - 'conflict_action': whether or not the coord has confirmed to drop this user from their existing section
                      possible values:
                        - empty: default; will result in a 422 response if there are conflicts
                        - 'DROP': drop the student from their existing section
                    - 'ban_action': what to do about the student if they're banned
                      possible values:
                        - empty: default; will result in a 422 response if the student is banned
                        - 'UNBAN_SKIP': unban the student, but *do not* enroll
                        - 'UNBAN': unban the students and enroll them
                request.data['actions']: dict of actions to take for misc errors
                    - request.data['actions']['capacity']: value is one of
                        - 'EXPAND': expand section
                        - 'SKIP': ignore the error (this means that the user should have deleted some students to add;
                                  if not, the server will respond again with the error)

            Error message format:
            - student add:
                { 'detail': 'error text' }
            - coordinator add:
                {
                    'errors': {
                        'critical': 'error text',
                        'capacity': 'capacity error message (not in dict if not raised)',
                    },
                    'progress': [
                        {'email': email, 'status': status, 'detail': {...detail}},
                        ...
                    ]
                }

            Error status format:
            - 'OK': student is ready to be enrolled (but no action has been taken)
            - 'CONFLICT': student is already enrolled in another section
                - if there is a cnoflicting section:
                    detail = { 'section': serialized section }
                - if user can't enroll:
                    detail = { 'reason': reason }
            - 'BANNED': student is currently banned from the course

            HTTP response status codes:
            - HTTP_422_UNPROCESSABLE_ENTITY: invalid input, or partially invalid input
                    sent with a 'progress' response indicating what went through and what didn't
            - HTTP_423_LOCKED: capacity hit (only sent if initiated by student)
            """

            if is_coordinator:
                return self._coordinator_add(request, section)
            else:
                return self._student_add(request, section)

    def _coordinator_add(self, request, section):
        """
        Adds a list of students as a coordinator.
        """

        class Status:
            """enum for different response statuses"""

            OK = "OK"
            CONFLICT = "CONFLICT"
            BANNED = "BANNED"

        class ConflictAction:
            """enum for actions to drop students"""

            DROP = "DROP"

        class CapacityAction:
            """enum for actions about capacity limits"""

            EXPAND = "EXPAND"
            SKIP = "SKIP"

        class BanAction:
            """enum for actions about banned students"""

            UNBAN_SKIP = "UNBAN_SKIP"
            UNBAN_ENROLL = "UNBAN_ENROLL"

        data = request.data

        if not data.get("emails"):
            return Response(
                {"error": "Must specify emails of students to enroll"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # filter out objects with no associated email, and remove duplicates
        _email_set = set()
        emails = []
        for obj in data.get("emails"):
            if obj and obj.get("email") and obj.get("email") not in _email_set:
                emails.append(obj)
                _email_set.add(obj.get("email"))

        response = {"errors": {}}

        """
        Possible items in db_actions:
        - ('capacity', 'EXPAND'): expand the section capacity
        - ('capacity', 'ENROLL'): enroll the students without expanding section capacity
        - ('create', email): create a new student object with email (and create user if needed)
        - ('enroll', student): modify the student object so they are now enrolled in this section (includes drop & enroll)
        - ('unban', student): unban the student from the course
        - ('unban_enroll', student): unban the student and enroll them in the section
        """
        db_actions = []

        any_invalid = False  # whether any studenet could not be added

        if len(emails) > section.capacity - section.current_student_count:
            # check whether the user has given any response to the capacity conflict
            if (
                data.get("actions")
                and data["actions"].get("capacity")
                and data["actions"]["capacity"] == CapacityAction.EXPAND
            ):
                # we're all good; store the user's choice
                db_actions.append(("capacity", data["actions"]["capacity"]))
            else:
                # no response, so add to the errors dict
                any_invalid = True
                response["errors"][
                    "capacity"
                ] = "There is no space available in this section"

        statuses = []  # status for each email
        # set of coord users (contains user ids)
        course_coords = section.mentor.course.coordinator_set.values_list(
            "user", flat=True
        )

        # Phase 1: go through emails and check for validity/conflicts
        for email_obj in emails:
            email = email_obj["email"]
            curstatus = {"email": email}
            # check to see if the student can be added

            # get all students with the email in the course
            student_queryset = Student.objects.filter(
                course=section.mentor.course, user__email=email
            )

            if student_queryset.count() > 1:
                # something bad happened, return immediately with error
                logger.error(
                    "<Enrollment:Critical> Multiple student objects exist in the"
                    f" database (Students {student_queryset.all()})!"
                )
                return Response(
                    {
                        "errors": {
                            "critical": (
                                "Duplicate student objects exist in the database"
                                f" (Students {student_queryset.all()})"
                            )
                        }
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            elif student_queryset.count() == 0:
                # check if the user can actually enroll in the section
                student_user = User.objects.get(email=email)
                if (
                    student_user.id not in course_coords
                    and student_user.can_enroll_in_course(
                        section.mentor.course, bypass_enrollment_time=True
                    )
                ):
                    # student does not exist yet; we can always create it
                    db_actions.append(("create", email))
                    curstatus["status"] = Status.OK
                else:
                    # user can't enroll; give details on the reason why
                    any_invalid = True
                    curstatus["status"] = Status.CONFLICT
                    reason = "other"
                    if student_user.id in course_coords:
                        reason = "coordinator"
                    elif student_user.mentor_set.filter(
                        course=section.mentor.course
                    ).exists():
                        reason = "mentor"
                    curstatus["detail"] = {"reason": reason}
            else:  # student_queryset.count() == 1
                student = student_queryset.get()

                if student.active:
                    # active student already exists
                    if email_obj.get("conflict_action") == ConflictAction.DROP:
                        # response confirmed, drop student and enroll
                        db_actions.append(("enroll", student))
                        curstatus["status"] = Status.OK
                    else:  # no response, give warning
                        any_invalid = True
                        curstatus["status"] = Status.CONFLICT
                        curstatus["detail"] = {
                            "section": SectionSerializer(student.section).data
                        }
                elif student.banned:
                    # check if there is a response
                    if email_obj.get("ban_action") == BanAction.UNBAN_SKIP:
                        # unban the student but do not enroll them
                        db_actions.append(("unban", student))
                        curstatus["status"] = Status.OK
                    elif email_obj.get("ban_action") == BanAction.UNBAN_ENROLL:
                        # unban the student and enroll them
                        db_actions.append(("unban_enroll", student))
                        curstatus["status"] = Status.OK
                    else:
                        any_invalid = True
                        curstatus["status"] = Status.BANNED
                else:
                    # student is inactive (i.e. they've dropped a section)
                    db_actions.append(("enroll", student))
                    curstatus["status"] = Status.OK
            statuses.append(curstatus)

        if any_invalid:
            # stop early and return the warnings
            response["progress"] = statuses
            return Response(response, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        # Phase 2: everything's good to go; do the database actions
        expand_capacity = False
        for action in db_actions:
            action_type, obj = action
            if action_type == "capacity":
                if obj == CapacityAction.EXPAND:
                    expand_capacity = True  # expand after we've enrolled everybody so we know how many we're enrolling
            elif action_type == "create":  # obj=email, type str
                email = obj
                # create student
                user, _ = User.objects.get_or_create(
                    email=email, username=email.split("@")[0]
                )
                # whitelist if necessary
                if section.mentor.course.is_restricted:
                    section.mentor.course.whitelist.add(user)
                student = Student.objects.create(
                    user=user, section=section, course=section.mentor.course
                )
                # generate new attendance objects for this student
                # in all section occurrences past this date
                now = timezone.now().astimezone(timezone.get_default_timezone())
                future_section_occurrences = section.sectionoccurrence_set.filter(
                    Q(date__gte=now.date())
                )
                for section_occurrence in future_section_occurrences:
                    att, created = Attendance.objects.get_or_create(
                        student=student,
                        sectionOccurrence=section_occurrence,
                    )
                    if created:
                        att.presence = ""
                        att.save()
                logger.info(
                    "<Enrollment> Created %s new attendances for user %s in Section %s",
                    len(future_section_occurrences),
                    log_str(student.user),
                    log_str(section),
                )
                student.save()
                logger.info(
                    f"<Enrollment:Success> User {log_str(student.user)} enrolled in"
                    f" Section {log_str(section)}"
                )
            elif action_type in ("enroll", "unban_enroll"):  # obj=student, type Student
                student = obj
                if action_type == "unban_enroll":  # unban student first
                    student.banned = False
                # enroll student
                old_section = student.section
                student.section = section
                student.active = True
                # generate new attendance objects for this student in all section occurrences past this date
                now = timezone.now().astimezone(timezone.get_default_timezone())
                future_sectionOccurrences = section.sectionoccurrence_set.filter(
                    Q(date__gte=now.date())
                )
                for section_occurrence in future_section_occurrences:
                    att, created = Attendance.objects.get_or_create(
                        student=student,
                        sectionOccurrence=section_occurrence,
                    )
                    if created:
                        att.presence = ""
                        att.save()
                logger.info(
                    f"<Enrollment> Created {len(future_sectionOccurrences)} new"
                    f" attendances for user {log_str(student.user)} in Section"
                    f" {log_str(section)}"
                )
                student.save()
                logger.info(
                    f"<Enrollment:Success> User {log_str(student.user)} swapped into"
                    f" Section {log_str(section)} from Section {log_str(old_section)}"
                )
            elif action_type == "unban":  # obj=student, type Student
                student = obj
                # unban student
                student.banned = False
                student.save()

        if expand_capacity:
            section.capacity = max(
                section.capacity, section.students.filter(active=True).count()
            )
            section.save()

        return Response(status=status.HTTP_200_OK)

    def _student_add(self, request, section):
        """
        Adds a student to a section (initiated by a student)
        """
        if not request.user.can_enroll_in_course(section.mentor.course):
            logger.warning(
                f"<Enrollment:Failure> User {log_str(request.user)} was unable to"
                f" enroll in Section {log_str(section)} because they are already"
                " involved in this course"
            )
            raise PermissionDenied(
                (
                    "You are already either mentoring for this course or enrolled in a"
                    " section, or the course is closed for enrollment"
                ),
                status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        if section.current_student_count >= section.capacity:
            logger.warning(
                f"<Enrollment:Failure> User {log_str(request.user)} was unable to"
                f" enroll in Section {log_str(section)} because it was full"
            )
            raise PermissionDenied(
                "There is no space available in this section", status.HTTP_423_LOCKED
            )

        student_queryset = request.user.student_set.filter(
            active=False, course=section.mentor.course
        )
        if student_queryset.count() > 1:
            logger.error(
                "<Enrollment:Critical> Multiple student objects exist in the database"
                f" (Students {student_queryset.all()})!"
            )
            return PermissionDenied(
                (
                    "An internal error occurred; email mentors@berkeley.edu"
                    " immediately. (Duplicate students exist in the database (Students"
                    f" {student_queryset.all()}))"
                ),
                code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        elif student_queryset.count() == 1:
            student = student_queryset.get()
            old_section = student.section
            student.section = section
            student.active = True
            # generate new attendance objects for this student in all section occurrences past this date
            now = timezone.now().astimezone(timezone.get_default_timezone())
            future_sectionOccurrences = section.sectionoccurrence_set.filter(
                Q(date__gte=now.date())
            )
            for sectionOccurrence in future_sectionOccurrences:
                Attendance(
                    student=student, sectionOccurrence=sectionOccurrence, presence=""
                ).save()
            logger.info(
                f"<Enrollment> Created {len(future_sectionOccurrences)} new attendances"
                f" for user {log_str(student.user)} in Section {log_str(section)}"
            )
            student.save()
            logger.info(
                f"<Enrollment:Success> User {log_str(student.user)} swapped into"
                f" Section {log_str(section)} from Section {log_str(old_section)}"
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        else:
            student = Student.objects.create(
                user=request.user, section=section, course=section.mentor.course
            )
            logger.info(
                f"<Enrollment:Success> User {log_str(student.user)} enrolled in Section"
                f" {log_str(section)}"
            )
            return Response({"id": student.id}, status=status.HTTP_201_CREATED)
