from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import WaitlistedStudentSerializer
from scheduler.views.utils import get_object_or_error

from ..models import Section, User, WaitlistedStudent
from .section import add_student
from .utils import logger


@api_view(["GET"])
def view(request, pk=None):
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


# CURRENT ISSUES: 61a and eecs16b don't allow adding to waitlist? may not be an issue
# already works as a student so the put doesn't actually work
@api_view(["PUT"])
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
            return response

    log_enroll_result(True, request.user, section)
    return Response(status=status.HTTP_201_CREATED)


@api_view(["PUT"])
def add_by_coord(request, pk=None):  # get this to work with only emails and no actions
    """
    Endpoint: /api/waitlist/<pk>/add
    pk= section id

    PUT: Add student to waitlist by coordinator.
    emails: Array<{ [email: string]: string }>;
    actions: {
        [action: string]: string;
    };
    """

    with transaction.atomic():
        section = get_object_or_error(Section.objects, pk=pk)
        section = Section.objects.select_for_update().get(pk=section.pk)

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

        for email_obj in data.get("emails"):
            email = email_obj.get("email") if isinstance(email_obj, dict) else email_obj
            if not email:
                return Response(
                    {"error": "Must specify email of student to waitlist"},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            user, _ = User.objects.get_or_create(
                username=email.split("@")[0], email=email
            )
            _add_to_waitlist_or_section(
                section,
                user,
                bypass_enrollment_time=True,
            )

    log_enroll_result(True, request.user, section)
    return Response(status=status.HTTP_200_OK)


def _add_to_waitlist_or_section(section, user, *, bypass_enrollment_time=False):
    course = section.mentor.course

    if not user.can_waitlist_in_course(
        course, bypass_enrollment_time=bypass_enrollment_time
    ):
        raise PermissionDenied("User cannot waitlist in this course.")

    if user.student_set.filter(active=True, section=section).exists():
        raise PermissionDenied("User is already enrolled in this section.")

    if not section.is_section_full:
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
    waitlisted_student.save()
    return None


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
def count_waitist(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/count_waitlist
    pk= section id
    """
    section = get_object_or_error(Section.objects, pk=pk)
    return Response(section.current_waitlist_count)
