from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from scheduler.notifications.ops_notifications import (
    queue_waitlist_confirmation,
    queue_waitlist_drop_confirmation,
)
from scheduler.serializers import WaitlistedStudentSerializer
from scheduler.views.utils import get_object_or_error

from ..models import Section, User, WaitlistedStudent
from .section import add_from_waitlist, add_student, swap_into_section
from .utils import logger


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def view(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>
    pk = section id

    GET: View all students on the waitlist for a section
    """
    section = get_object_or_error(Section.objects, pk=pk)
    if section.mentor is None:
        raise NotFound("This section has no mentor assigned.")
    is_mentor = request.user == section.mentor.user
    is_coord = bool(
        section.mentor.course.coordinator_set.filter(user=request.user).count()
    )
    if not is_mentor and not is_coord:
        raise PermissionDenied("You do not have permission to view this waitlist")

    waitlist_queryset = WaitlistedStudent.objects.filter(active=True, section=section)
    return Response(WaitlistedStudentSerializer(waitlist_queryset, many=True).data)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def add(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/add
    pk= section id

    PUT: Add a new waitlist student to section. Pass in section id. Called by user
    who wants to be waitlisted. NOT by coordinator on behalf of student.
    - if user cannot enroll in section, deny permission
    - if user is already on waitlist for this section, deny
    - if waitlist is full, deny permission
    - if section is not full, enroll instead.
    """

    with transaction.atomic():
        section = get_object_or_error(Section.objects, pk=pk)
        section = Section.objects.select_for_update().get(pk=section.pk)
        student = request.user

        response = _add_to_waitlist_or_section(
            section,
            student,
            bypass_enrollment_time=False,
        )
        if response is not None:
            # User was auto-enrolled (section had room), return the enrollment response
            return response

    # User was added to the waitlist (not enrolled)
    log_enroll_result(True, request.user, section)
    return Response(status=status.HTTP_201_CREATED)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def add_by_coord(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/coordadd
    pk = section id

    PUT: Add students to waitlist (or section if room) by coordinator.
    Processes each email independently — failures for one email do not
    prevent other emails from being processed.

    Request body:
        emails: list of {"email": str}
    """

    section = get_object_or_error(Section.objects, pk=pk)

    is_coord = bool(
        section.mentor.course.coordinator_set.filter(user=request.user).count()
    )
    if not is_coord:
        raise PermissionDenied("You must be a coord to perform this action.")

    data = request.data or {}

    if not data.get("emails"):
        return Response(
            {"error": "Must specify emails of students to waitlist"},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    # Deduplicate and validate email list
    email_set = set()
    emails = []
    for obj in data.get("emails"):
        email = obj.get("email") if isinstance(obj, dict) else obj
        if email and email not in email_set:
            emails.append(email)
            email_set.add(email)

    if not emails:
        return Response(
            {"error": "Must specify email of student to waitlist"},
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    results = []
    any_errors = False
    for email in emails:
        with transaction.atomic():
            section = Section.objects.select_for_update().get(pk=section.pk)
            user, _ = User.objects.get_or_create(
                username=email.split("@")[0], email=email
            )
            try:
                _add_to_waitlist_or_section(
                    section,
                    user,
                    bypass_enrollment_time=True,
                )
                results.append({"email": email, "status": "OK"})
                logger.info(
                    "<Waitlist:Success> User %s added to Waitlist for Section %s by coordinator %s",
                    user,
                    section,
                    request.user,
                )
            except PermissionDenied as exc:
                any_errors = True
                results.append(
                    {
                        "email": email,
                        "status": "CONFLICT",
                        "detail": {"reason": str(exc.detail)},
                    }
                )
                logger.warning(
                    "<Waitlist:Failure> User %s not added to Waitlist for Section %s: %s",
                    user,
                    section,
                    exc.detail,
                )

    response_data = {"errors": {}, "progress": results}
    if any_errors:
        return Response(response_data, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
    return Response(status=status.HTTP_200_OK)


def _add_to_waitlist_or_section(section, user, *, bypass_enrollment_time=False):
    """Add a user to a section or its waitlist.

    Returns a Response when the user was enrolled (or swapped) into the section,
    or None when the user was added to the waitlist.
    """
    course = section.mentor.course

    if not user.can_waitlist_in_course(
        course, bypass_enrollment_time=bypass_enrollment_time
    ):
        raise PermissionDenied("User cannot waitlist in this course.")

    if user.student_set.filter(active=True, section=section).exists():
        raise PermissionDenied("User is already enrolled in this section.")

    if user.mentor_set.filter(section__mentor__course=course).exists():
        raise PermissionDenied("Mentors cannot waitlist in a course they mentor.")

    if not section.is_section_full:
        # If user is already enrolled in another section, swap them
        if user.student_set.filter(active=True, course=course).exists():
            old_section_id = swap_into_section(section, user)
            if old_section_id is not None:
                add_from_waitlist(pk=old_section_id)
            return Response(status=status.HTTP_200_OK)
        return add_student(section, user)

    if section.is_waitlist_full:
        raise PermissionDenied("There is no space available in this waitlist.")

    if not user.can_enroll_in_waitlist(course):
        raise PermissionDenied(
            "User is waitlisted in the max amount of waitlists for this course."
        )

    if WaitlistedStudent.objects.filter(
        active=True, section=section, user=user
    ).exists():
        raise PermissionDenied("User is already waitlisted in this section.")

    waitlisted_student = WaitlistedStudent.objects.create(
        user=user, section=section, course=course
    )
    queue_waitlist_confirmation(waitlisted_student)
    return None


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def drop(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/drop
    pk = waitlisted student id

    PATCH: Drop a student off the waitlist.
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
    queue_waitlist_drop_confirmation(waitlisted_student)
    logger.info(
        "<Drop> User %s dropped from Waitlist for Section %s",
        user,
        waitlisted_student.section,
    )
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


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def count_waitlist(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/count_waitlist
    pk= section id
    """
    section = get_object_or_error(Section.objects, pk=pk)
    return Response(section.current_waitlist_count)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def position(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/position
    pk = section id

    GET: Get the current user's position on the waitlist for a section.
    Returns {"position": <int>} where position is 1-indexed rank among
    active waitlisted students.
    """
    section = get_object_or_error(Section.objects, pk=pk)
    waitlisted_student = WaitlistedStudent.objects.filter(
        active=True, section=section, user=request.user
    ).first()
    if waitlisted_student is None:
        raise NotFound("You are not on the waitlist for this section.")

    # Count how many active waitlisted students have a higher-priority (lower) position
    rank = (
        WaitlistedStudent.objects.filter(
            active=True,
            section=section,
            position__lt=waitlisted_student.position,
        ).count()
        + 1
    )

    return Response({"position": rank})
