from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import WaitlistedStudentSerializer
from scheduler.views.utils import get_object_or_error

from ..models import Section, WaitlistedStudent, Student, User
from .section import add_student
from .utils import logger

from ..email.email_utils import email_waitlist, email_waitlist_drop

@api_view(["GET"])
def get_waitlist_students(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>
    pk = section id

    GET: View all students on the waitlist for a section
    """
    section = get_object_or_error(Section.objects, pk=pk)
    is_mentor = request.user == section.mentor.user
    is_coord = bool(
        section.mentor.course.coordinator_set.filter(user=request.user).count()
    )
    if not is_mentor and not is_coord:
        raise PermissionDenied("You do not have permission to view this waitlist")

    waitlist_queryset = WaitlistedStudent.objects.filter(active=True, section=section)
    return Response(WaitlistedStudentSerializer(waitlist_queryset, many=True).data)


@api_view(["POST"])
def add(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/add
    pk= section id

    POST: Add a new waitlist student to section. Pass in section id. Called by user
    - if user cannot enroll in section, deny permission
    - if user is already on waitlist for this section, deny
    - if waitlist is full, deny permission
    - if section is not full, enroll instead.
    """
    section = get_object_or_error(Section.objects, pk=pk)
    course = section.mentor.course
    user = request.user

    # Checks that student is able to enroll in the course
    if not user.can_enroll_in_course(course):
        log_enroll_result(
            False,
            user,
            section,
            reason=(
                "User already involved in this course or course is closed for"
                " enrollment"
            ),
        )
        raise PermissionDenied(
            "You are either mentoring for this course, already enrolled in a section, "
            "or the course is closed for enrollment.",
        )

    # If there is space in the section, attempt to enroll the student directly
    if not section.is_section_full:
        return add_student(section, user)

    # If the waitlist is full, throw an error
    if section.is_waitlist_full:
        log_enroll_result(False, user, section, reason="Waitlist is full")
        raise PermissionDenied("There is no space available in this section.")

    # If user has waitlisted in the max number of waitlists allowed for the course
    if not user.can_enroll_in_waitlist(course):
        log_enroll_result(
            False,
            user,
            section,
            reason="User has waitlisted in max amount of waitlists for the course",
        )
        raise PermissionDenied(
            "You are waitlisted in the max amount of waitlists for this course."
        )

    # Check if the student is already enrolled in the waitlist for this section
    waitlist_queryset = WaitlistedStudent.objects.filter(
        active=True, section=section, user=user
    )
    if waitlist_queryset.count() != 0:
        log_enroll_result(
            False,
            user,
            section,
            reason="User is already waitlisted in this section",
        )
        raise PermissionDenied("You are already waitlisted in this section.")

    # Check if the waitlist student has a position (only occurs when manually inserting a student)
    specified_position = request.data.get("position", None)

    # Create the new waitlist student and save
    waitlisted_student = WaitlistedStudent.objects.create(
        user=user, section=section, course=course, position=specified_position
    )
    waitlisted_student.save()

    log_enroll_result(True, request.user, section)

    # Send waitlist email
    email_waitlist(waitlisted_student, logger)

    return Response(status=status.HTTP_201_CREATED)

@api_view(["POST"])
def coordinator_add(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/coordinator_add
    pk= section id

    POST: Add a new waitlist student to section.
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
    
    section = get_object_or_error(Section.objects, pk=pk)
    course = section.mentor.course
    user = request.user
    data = request.data
    is_coordinator = course.coordinator_set.filter(user=user).exists()

    # Check that the user has permissions to add a user to a waitlist
    if not is_coordinator:
        raise PermissionDenied(
            "You do not have permission to add this student to the waitlist"
        )
    
    # Validate an email is provided to identify the user being waitlisted
    if not data.get("emails"):
        return Response(
            {"error": "Must specify emails of students to enroll"},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    
    if not section.is_section_full:
        return Response(
            {"error": "This section is still open and will autoprocess waitlist."},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )
    
    # Step 1: filter valid, unique emails
    email_set = set()
    emails = []
    for obj in data.get("emails"):
        if obj and obj.get("email") and obj.get("email") not in email_set:
            emails.append(obj)
            email_set.add(obj.get("email"))

    response = {"errors": {}}
    db_actions = []
    any_invalid = False

    if len(emails) > section.waitlist_capacity - section.current_waitlist_count:
        # check whether the user has given any response to the capacity conflict
        if (
            data.get("actions")
            and data["actions"].get("waitlist_capacity")
            and data["actions"]["waitlist_capacity"] == CapacityAction.EXPAND
        ):
            # we're all good; store the user's choice
            db_actions.append(("waitlist_capacity", data["actions"]["waitlist_capacity"]))
        else:
            # no response, so add to the errors dict
            any_invalid = True
            response["errors"][
                "waitlist_capacity"
            ] = "There is no space available in this waitlist"

    statuses = []

    # Step 2: Phase 1 - validate and collect actions
    for email_obj in emails:
        email = email_obj["email"]
        curstatus = {"email": email}

        # Check user's waitlists
        waitlist_queryset = WaitlistedStudent.objects.filter(
            course=course, user__email=email
        )

        if waitlist_queryset.count() > course.waitlist_capacity:
            logger.error(
                "<Enrollment:Critical> Multiple student objects exist in the"
                " database (Students %s)!",
                waitlist_queryset.all(),
            )
            return Response(
                {
                    "errors": {
                        "critical": (
                            "Duplicate waitlisted student objects exist in the database"
                            f" (Waitlisted students {waitlist_queryset.all()})"
                        )
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        
        if waitlist_queryset.count() == course.waitlist_capacity:
            # TODO Specify waitlist to swap out of or error
            pass

        if waitlist_queryset.count() == 0:
            # TODO Check if user can actually waitlist in the section waitlist
            user, _ = User.objects.get_or_create(
                username=email.split("@")[0], email=email
            )


        # Check if already enrolled
        if Student.objects.filter(course=section.mentor.course, user=user, active=True).exists():
            any_invalid = True
            curstatus["status"] = Status.CONFLICT
            curstatus["detail"] = {"reason": "already enrolled"}
        
        # Check if already waitlisted
        elif WaitlistedStudent.objects.filter(section=section, user=user).exists():
            any_invalid = True
            curstatus["status"] = Status.CONFLICT
            curstatus["detail"] = {"reason": "already waitlisted"}

        else:
            # No conflicts — proceed to create waitlist entry
            db_actions.append(("create_waitlisted_student", user))
            curstatus["status"] = Status.OK

        statuses.append(curstatus)

    if any_invalid:
        response["progress"] = statuses
        return Response(response, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


@api_view(["PATCH"])
def drop(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/drop
    pk= section id

    PATCH: Drop a student off the waitlist. Pass in waitlisted student ID
    - sets to inactive. Called by user or coordinator.

    """
    user = request.user
    waitlisted_student = WaitlistedStudent.objects.filter(pk=pk).first()
    if waitlisted_student is None:
        raise NotFound("Student is not on the waitlist for this section")
    section = waitlisted_student.section
    course = section.mentor.course
    is_coordinator = course.coordinator_set.filter(user=user).exists()

    # Check that the user has permissions to drop this student
    if waitlisted_student.user != user and not is_coordinator:
        raise PermissionDenied(
            "You do not have permission to drop this student from the waitlist"
        )
    # Remove the waitlisted student
    waitlisted_student.active = False
    # waitlisted_student.delete()
    waitlisted_student.save()
    logger.info(
        "<Drop> User %s dropped from Waitlist for Section %s",
        user,
        waitlisted_student.section,
    )

    # Send drop email
    email_waitlist_drop(waitlisted_student, logger)

    return Response(status=status.HTTP_204_NO_CONTENT)


def log_enroll_result(success, user, section, reason=None):
    """Logs waitlist success or failure for a user in a section."""
    if success:
        logger.info(
            "<Waitlist:Success> User %s enrolled into Waitlist for Section %s",
            user,
            section,
        )
    else:
        logger.warning(
            "<Waitlist:Failure> User %s not enroll in Waitlist for Section %s: %s",
            user,
            section,
            reason,
        )
