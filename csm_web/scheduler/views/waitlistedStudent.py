from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Section, WaitlistedStudent
from .utils import get_object_or_error, logger

DEFAULT_CAPACITY = 3


def can_enroll_in_waitlist(course, section):
    """
    Checks if student is able to enroll in waitlist
    - Takes a course and section object
    """
    waitlist_queryset_all = WaitlistedStudent.objects.filter(active=True, course=course)

    if waitlist_queryset_all.count() >= course.waitlist_capacity:
        return False

    waitlist_queryset_section = waitlist_queryset_all.filter(section=section.id)

    if waitlist_queryset_section.count() == 1:
        return False
    return True


@api_view(["POST"])
def add(request, pk=None):
    """
    Endpoint: /api/waitlistedstudent/add

    POST: Add a new waitlist student to section.
    - if user cannot enroll in section, deny permission
    - if waitlist is full, deny permission
    - if section is not full, enroll instead.
    """
    section = get_object_or_error(Section.objects, pk=pk)
    course = section.course
    user = request.user

    if not user.can_enroll_in_course(course):
        log_enroll_result(
            False, user, section, reason="User already involved in this course"
        )
        raise PermissionDenied(
            "You are either mentoring for this course, already enrolled in a section,  "
            "               or the course is closed for enrollment.",
            code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    if section.is_waitlist_full:
        log_enroll_result(False, user, section, reason="Waitlist is full")
        raise PermissionDenied(
            "There is no space available in this section.", code=status.HTTP_423_LOCKED
        )

    if not can_enroll_in_waitlist(course, section):
        log_enroll_result(
            False,
            user,
            section,
            reason=(
                "User is either already waitlisted in this section,                   "
                " or is at capacity for waitlisting for sections in this course."
            ),
        )
        raise PermissionDenied(
            "You are either already waitlisted in this section,                    or"
            " are at capacity for waitlisting for sections in this course.",
            code=status.HTTP_423_LOCKED,
        )

    waitlisted_student = WaitlistedStudent.objects.create(
        user=user, section=section, course=course
    )
    waitlisted_student.save()

    log_enroll_result(True, request.user, section)
    return Response(status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
def drop(request, pk=None):
    """
    Endpoint: /api/waitlistedstudent/<pk>/drop

    PATCH: Drop a student off the waitlist
    - sets to inactive

    """
    waitlisted_student = WaitlistedStudent.objects.get(pk=pk)
    course = waitlisted_student.course
    user = request.user

    is_coordinator = course.is_coordinator(user)
    if waitlisted_student.user != user and not is_coordinator:
        raise PermissionDenied(
            "You do not have permission to drop this student from the waitlist"
        )

    waitlisted_student.active = False

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
