import datetime
import re

from django.core.exceptions import ValidationError as ModelValidationError
from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from scheduler.models import (
    Attendance,
    Course,
    Mentor,
    Section,
    SectionOccurrence,
    Spacetime,
    Student,
    User,
)
from scheduler.serializers import (
    SectionOccurrenceSerializer,
    SectionSerializer,
    StudentSerializer,
)

from ..email.email_utils import email_enroll, email_swap, email_waitlist_drop
from ..models import WaitlistedStudent
from .utils import (
    get_object_or_error,
    log_str,
    logger,
    viewset_with,
    weekday_iso_to_string,
)


def add_student(section, user):
    """
    Helper Function:

    Adds a student to a section (initiated by an API call)
    """
    # Checks that user is able to enroll in the course
    if not user.can_enroll_in_course(section.mentor.course):
        logger.warning(
            "<Enrollment:Failure> User %s was unable to enroll in Section %s"
            " because they are already involved in this course",
            log_str(user),
            log_str(section),
        )
        raise PermissionDenied(
            "You are already either mentoring for this course or enrolled in a"
            " section, or the course is closed for enrollment",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # Check that the section is not full
    if section.is_section_full:
        logger.warning(
            "<Enrollment:Failure> User %s was unable to enroll in Section %s"
            " because it was full",
            log_str(user),
            log_str(section),
        )
        raise PermissionDenied(
            "There is no space available in this section", status.HTTP_423_LOCKED
        )

    # Check that the student exists only once
    student_queryset = user.student_set.filter(
        active=False, course=section.mentor.course
    )
    if student_queryset.count() > 1:
        logger.error(
            "<Enrollment:Critical> Multiple student objects exist in the"
            " database (Students %s)!",
            student_queryset.all(),
        )
        return PermissionDenied(
            "An internal error occurred; email mentors@berkeley.edu"
            " immediately. (Duplicate students exist in the database (Students"
            f" {student_queryset.all()}))",
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    if student_queryset.count() == 1:
        student = student_queryset.get()
        old_section = student.section
        student.section = section
        student.active = True
        # generate new attendance objects for this student
        # in all section occurrences past this date
        now = timezone.now().astimezone(timezone.get_default_timezone())
        future_section_occurrences = section.sectionoccurrence_set.filter(
            Q(date__gte=now.date())
        )
        for section_occurrence in future_section_occurrences:
            Attendance(
                student=student, sectionOccurrence=section_occurrence, presence=""
            ).save()
        logger.info(
            "<Enrollment> Created %s new attendances for user %s in Section %s",
            len(future_section_occurrences),
            log_str(student.user),
            log_str(section),
        )
        student.save()
        logger.info(
            "<Enrollment:Success> User %s swapped into Section %s from Section %s",
            log_str(student.user),
            log_str(section),
            log_str(old_section),
        )

        # Send swap email
        email_swap(student, logger)  

        return Response(status=status.HTTP_204_NO_CONTENT)

    student = Student.objects.create(
        user=user, section=section, course=section.mentor.course
    )

    # Removes all waitlists the student that added was a part of
    waitlist_set = WaitlistedStudent.objects.filter(
        user=user, active=True, course=student.course
    )

    for waitlist in waitlist_set:
        waitlist.active = False
        # waitlist.delete()
        waitlist.save()

        # Send drop email
        email_waitlist_drop(waitlist, logger)

    logger.info(
        "<Enrollment:Success> User %s enrolled in Section %s",
        log_str(student.user),
        log_str(section),
    )

    # Send enroll email
    email_enroll(student, logger)

    return Response({"id": student.id}, status=status.HTTP_201_CREATED)


def add_from_waitlist(pk):
    """
    Helper function for adding from waitlist. Called by drop user api

    Checks to see if it is possible to add a student to a section off the waitlist.
    Will remove added student from all other waitlists as well
    - Will only add ONE student
    - Waitlist student is deactivated
    - Changes nothing if fails to add class

    """
    # Finds section and waitlist student, searches for position
    # (manually inserted student) then timestamp
    section = Section.objects.get(pk=pk)
    waitlisted_student = (
        WaitlistedStudent.objects.filter(active=True, section=section)
        .order_by("position", "timestamp")
        .first()
    )

    # Check if there are waitlisted students
    if not waitlisted_student:
        logger.info(
            "<Waitlist:Skipped> No waitlist users for section %s",
            log_str(section),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Adds the student
    add_student(waitlisted_student.section, waitlisted_student.user)
    logger.info(
        "<Enrollment:Success> User %s removed from all Waitlists for Course %s",
        log_str(waitlisted_student.user),
        log_str(waitlisted_student.course),
    )
    return Response(status=status.HTTP_201_CREATED)


class SectionViewSet(*viewset_with("retrieve", "partial_update", "create")):
    serializer_class = SectionSerializer

    def get_object(self):
        """Retrieve section object"""
        return get_object_or_error(self.get_queryset(), **self.kwargs)

    def get_queryset(self):
        """
        Retrieve all section objects associated with the user,
        excluding those from courses the user is banned from
        """
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
                # pylint: disable-next=unsupported-binary-operation
                Q(mentor__user=self.request.user)
                | Q(students__user=self.request.user)
                | Q(mentor__course__coordinator__user=self.request.user)
            )
            .distinct()
        )

    def create(self, request):
        """
        Handle request to create new section through the UI;
        creates mentor and spacetimes along with it
        """
        course = get_object_or_error(
            Course.objects.all(),
            pk=request.data["course_id"],
            coordinator__user=self.request.user,
        )
        # We have an atomic block here because several different objects must be created
        # in the course of creating a single Section. If any of these were to fail,
        # whatever objects we had already created would be left 'dangling' so-to-speak,
        # not being attached to other entities in a way consistent with the rest of the
        # application's logic. Therefore the atomic block - if any failures are encountered,
        # any objects created within the atomic block before the point of failure are rolled back.
        with transaction.atomic():
            mentor_user, _ = User.objects.get_or_create(
                email=request.data["mentor_email"],
                username=request.data["mentor_email"].split("@")[0],
            )

            if "spacetimes" not in request.data:
                raise ValidationError("Spacetimes must be provided")

            request_spacetimes = request.data["spacetimes"]
            request_description = request.data.get("description", "")
            request_capacity = request.data.get("capacity", 0)

            spacetime_objects = []
            for spacetime in request_spacetimes:
                spacetime_duration = spacetime.get("duration", None)
                if spacetime_duration is None:
                    raise ValidationError("Spacetime durations must all be specified")

                spacetime_day_of_week = spacetime.get("day_of_week", None)
                try:
                    spacetime_day_of_week = int(spacetime_day_of_week)
                except ValueError as err:
                    raise ValidationError(
                        "Spacetime day of week must be an integer"
                    ) from err
                if spacetime_day_of_week is None:
                    raise ValidationError("Spacetime day of week must be specified")
                if spacetime_day_of_week < 1 or spacetime_day_of_week > 7:
                    raise ValidationError(
                        "Spacetime day of week must be between 1 and 7 inclusive"
                    )

                spacetime_location = spacetime.get("location", None)
                if spacetime_location is None:
                    raise ValidationError("Spacetime location must be specified")
                spacetime_start_time = spacetime.get("start_time", None)
                if spacetime_start_time is None:
                    raise ValidationError("Spacetime start time must be specified")

                # create and validate all spacetimes prior to saving them
                converted_duration = datetime.timedelta(minutes=spacetime_duration)
                converted_day_of_week = weekday_iso_to_string(spacetime_day_of_week)
                new_spacetime = Spacetime(
                    location=spacetime.get("location"),
                    start_time=spacetime.get("start_time"),
                    duration=converted_duration,
                    day_of_week=converted_day_of_week,
                )

                try:
                    new_spacetime.full_clean()
                except ModelValidationError as err:
                    raise ValidationError(err.error_dict) from err

                spacetime_objects.append(new_spacetime)

            for spacetime in spacetime_objects:
                try:
                    spacetime.full_clean()
                except ModelValidationError as err:
                    raise ValidationError(err.error_dict) from err

                spacetime.save()

            try:
                mentor = Mentor.objects.create(user=mentor_user, course=course)
                section = Section.objects.create(
                    mentor=mentor,
                    description=request_description,
                    capacity=request_capacity,
                )
                section.spacetimes.set(spacetime_objects)

                section.full_clean()
            except ModelValidationError as err:
                # re-raise any validation errors
                raise ValidationError(err.error_dict) from err

            section.save()

        serializer = self.serializer_class(section)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        """Update section metadata (capacity and description)"""
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
                "<Section:Meta:Success> Updated metadata on section %s",
                log_str(section),
            )
            return Response(status=status.HTTP_202_ACCEPTED)

        # invalid section metadata
        logger.info(
            "<Section:Meta:Failure> Failed to update metadata on section %s",
            log_str(section),
        )
        return Response(status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    @action(detail=True, methods=["get"])
    def attendance(self, request, pk=None):
        """Fetch all section occurrences for the section"""
        section = get_object_or_error(self.get_queryset(), pk=pk)
        return Response(
            SectionOccurrenceSerializer(
                section.sectionoccurrence_set.all(), many=True
            ).data
        )

    @action(detail=True, methods=["get", "put"])
    def students(self, request, pk=None):
        """
        GET: Fetch all students for the section
        PUT: Update students in the section

            Request format:
            - student add:
                request.user: student that wants to add section
                pk: primary key of section to enroll into

            - coordinator add:
                request.user: coordinator that wants to add students
                pk: primary key of section to enroll into
                request.data['emails']: array of objects with keys:
                    - 'email': email of student
                    - 'conflict_action': whether or not the coord has confirmed to drop this user
                                         from their existing section
                      possible values:
                        - empty: default; will result in a 422 response if there are conflicts
                        - 'DROP': drop the student from their existing section
                    - 'ban_action': what to do about the student if they're banned
                      possible values:
                        - empty: default; will result in a 422 response if the student is banned
                        - 'UNBAN_SKIP': unban the student, but *do not* enroll
                        - 'UNBAN': unban the students and enroll them
                    - 'restricted_action': what to do about the student if they are attempting
                          to enroll in a restricted course that they are not whitelisted for
                      possible values:
                        - empty: default; will result in a 422 response if the student
                                 is not whitelisted
                        - 'WHITELIST': whitelist the student to the course
                request.data['actions']: dict of actions to take for misc errors
                    - request.data['actions']['capacity']: value is one of
                        - 'EXPAND': expand section
                        - 'SKIP': ignore the error (this means that the user should have deleted
                                  some students to add; if not, the server will respond again
                                  with the error)

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
            - 'RESTRICTED': course is restricted and student is not whitelisted

            HTTP response status codes:
            - HTTP_422_UNPROCESSABLE_ENTITY: invalid input, or partially invalid input
                    sent with a 'progress' response indicating what went through and what didn't
            - HTTP_423_LOCKED: capacity hit (only sent if initiated by student)
        """
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
            # We reload the section object for atomicity. Even though we do not update
            # the section directly, any student trying to enroll must first acquire a lock on the
            # desired section. This allows us to assume that current_student_count is correct.
            section = get_object_or_error(Section.objects, pk=pk)
            section = (
                Section.objects.select_for_update()
                .prefetch_related("mentor__course")
                .get(pk=section.pk)
            )
            is_coordinator = bool(
                section.mentor.course.coordinator_set.filter(user=request.user).count()
            )

            if is_coordinator:
                return self._coordinator_add(request, section)
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
            RESTRICTED = "RESTRICTED"

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

        class RestrictedAction:
            """enum for actions about restricted courses"""

            WHITELIST = "WHITELIST"

        data = request.data

        if not data.get("emails"):
            return Response(
                {"error": "Must specify emails of students to enroll"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # filter out objects with no associated email, and remove duplicates
        email_set = set()
        emails = []
        for obj in data.get("emails"):
            if obj and obj.get("email") and obj.get("email") not in email_set:
                emails.append(obj)
                email_set.add(obj.get("email"))

        response = {"errors": {}}
        # Possible items in db_actions:
        # - ('capacity', 'EXPAND'): expand the section capacity
        # - ('capacity', 'ENROLL'): enroll the students without expanding section capacity
        # - ('create', email): create a new student object with email (and create user if needed)
        # - ('enroll', student): enroll the student in this section (includes drop & enroll)
        # - ('unban', student): unban the student from the course
        # - ('unban_enroll', student): unban the student and enroll them in the section
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
                    " database (Students %s)!",
                    student_queryset.all(),
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
            if student_queryset.count() == 0:
                # check if the user can actually enroll in the section
                student_user, _ = User.objects.get_or_create(
                    username=email.split("@")[0], email=email
                )
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
                    curstatus["status"] = Status.CONFLICT
                    if not student_user.is_whitelisted_for(section.mentor.course):
                        if (
                            email_obj.get("restricted_action")
                            == RestrictedAction.WHITELIST
                        ):
                            db_actions.append(("create", email))
                            curstatus["status"] = Status.OK
                        else:
                            any_invalid = True
                            curstatus["status"] = Status.RESTRICTED
                    else:
                        any_invalid = True
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
                    if (
                        not student.user.is_whitelisted_for(student.course)
                        and email_obj.get("restricted_action")
                        != RestrictedAction.WHITELIST
                    ):
                        any_invalid = True
                        curstatus["status"] = Status.RESTRICTED
                    else:
                        db_actions.append(("enroll", student))
                        curstatus["status"] = Status.OK
            statuses.append(curstatus)

        if any_invalid:
            # stop early and return the warnings
            response["progress"] = statuses
            return Response(response, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

        # Phase 2: everything's good to go; do the database actions
        expand_capacity = False
        for db_action in db_actions:
            action_type, obj = db_action
            if action_type == "capacity":
                if obj == CapacityAction.EXPAND:
                    # expand after we've enrolled everybody so we know how many we're enrolling
                    expand_capacity = True
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
                    "<Enrollment:Success> User %s enrolled in Section %s",
                    log_str(student.user),
                    log_str(section),
                )
            elif action_type in ("enroll", "unban_enroll"):  # obj=student, type Student
                student = obj
                if action_type == "unban_enroll":  # unban student first
                    student.banned = False
                # enroll student
                old_section = student.section
                student.section = section
                student.active = True
                # whitelist if not already
                if not student.user.is_whitelisted_for(student.course):
                    student.course.whitelist.add(student.user)
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
                    "<Enrollment:Success> User %s swapped into Section %s from"
                    " Section %s",
                    log_str(student.user),
                    log_str(section),
                    log_str(old_section),
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
        return add_student(section, request.user)

    @action(detail=True, methods=["get", "put"])
    def wotd(self, request, pk=None):
        """
        GET: Fetch all words of the day for the section.

        POST: Handles all submitting with regards to the word of the day.
            If user is a mentor:
                Updates the word of the day
            If user is a student:
                Attempts to update the attendance for the student
                for the given section occurrence.

            Common format:
                { id: int, word: string }
                where "id" is the section occurrence id
        """
        section = get_object_or_error(Section.objects, pk=pk)
        course = section.mentor.course

        is_student = Student.objects.filter(
            user=request.user, active=True, section=pk
        ).exists()
        is_mentor = section.mentor.user == request.user
        is_coordinator = section.mentor.course.coordinator_set.filter(
            user=request.user
        ).exists()

        if request.method == "GET":
            if not is_mentor and not is_coordinator:
                raise PermissionDenied(
                    detail=(
                        "Cannot retrieve word of the day if not a mentor or coordinator"
                    )
                )
            data = section.sectionoccurrence_set.values("id", "word_of_the_day")
            return Response(list(data), status=status.HTTP_200_OK)
        if request.method == "PUT":
            if is_student:
                # submit word of the day
                attendance_pk = request.data.get("attendance_id", None)
                submitted_word = request.data.get("word_of_the_day", None)
                if attendance_pk is None or submitted_word is None:
                    return Response(
                        {"detail": "Invalid data"}, status=status.HTTP_400_BAD_REQUEST
                    )
                # reformat word
                submitted_word = submitted_word.lower().strip()
                if not submitted_word:
                    return Response(
                        {"detail": "Invalid data"}, status=status.HTTP_400_BAD_REQUEST
                    )

                # fetch section occurrence from attendance
                section_occurrence = get_object_or_error(
                    Attendance.objects, pk=attendance_pk
                ).sectionOccurrence

                # check deadline, if defined
                if course.word_of_the_day_limit is not None:
                    deadline = section_occurrence.date + course.word_of_the_day_limit
                    current_date = (
                        timezone.now()
                        .astimezone(timezone.get_default_timezone())
                        .date()
                    )

                    if current_date > deadline:
                        raise PermissionDenied(detail="Deadline passed")

                student = Student.objects.filter(
                    user=request.user, active=True, section=section_occurrence.section
                ).first()

                # If the attempt at the word of the day is incorrect, deny request
                if section_occurrence.word_of_the_day.lower() != submitted_word.lower():
                    raise PermissionDenied(detail="Incorrect word of the day")

                attendance = Attendance.objects.get(
                    student=student, sectionOccurrence=section_occurrence
                )
                if attendance.presence != "":
                    # if attendance is not blank, reject word of the day
                    raise PermissionDenied(detail="Attendance already taken")

                # Otherwise update the attendance to be present.
                attendance.presence = "PR"
                attendance.save()
            elif is_mentor or is_coordinator:
                # change word of the day
                section_occurrence_pk = request.data.get("section_occurrence_id", None)
                submitted_word = request.data.get("word_of_the_day", None)
                if section_occurrence_pk is None or submitted_word is None:
                    return Response(
                        {"error": "invalid data"}, status=status.HTTP_400_BAD_REQUEST
                    )
                # reformat word
                submitted_word = submitted_word.lower().strip()

                # fetch section occurrence
                section_occurrence = get_object_or_error(
                    SectionOccurrence.objects.all(), pk=section_occurrence_pk
                )

                # Do not allow for empty word of the days or whitespace,
                # if not empty then updates the word of the day for the section Occurrence
                has_whitespace = bool(
                    re.search(r"\s", request.data["word_of_the_day"].strip())
                )
                if request.data["word_of_the_day"] == "":
                    raise PermissionDenied(detail="Word of the day must be non empty")
                if has_whitespace:
                    raise PermissionDenied(
                        detail="Word of the day can not contain white space"
                    )

                section_occurrence.word_of_the_day = (
                    request.data["word_of_the_day"].strip().lower()
                )
                section_occurrence.save()
            else:
                # Must be a student, mentor, or coordinator of the class to change anything
                raise PermissionDenied(
                    detail="Must be a student, mentor, or coordinator of the section"
                )

            return Response({}, status=status.HTTP_200_OK)

        raise PermissionDenied()
