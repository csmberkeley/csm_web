from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Section, WaitlistedStudent
from .section import add_student
from .utils import logger


@api_view(["POST"])
def add(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/add

    POST: Add a new waitlist student to section. Pass in section id. Called by user
    - if user cannot enroll in section, deny permission
    - if user is already on waitlist for this section, deny
    - if waitlist is full, deny permission
    - if section is not full, enroll instead.
    """
    section = Section.objects.get(pk=pk)
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
            "or the course is closed for enrollment."
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
<<<<<<< HEAD
    
    if not user.can_enroll_in_waitlist(course, section):
        log_enroll_result(False, user, section, reason="User is either already waitlisted in this section, \
                   or is at capacity for waitlisting for sections in this course.")
        raise PermissionDenied(
            "You are either already waitlisted in this section.",
            code=status.HTTP_423_LOCKED,
        )
=======
        raise PermissionDenied("You are already waitlisted in this section.")
>>>>>>> 1fa5c9b (adds tests)

    # Check if the waitlist student has a position (only occurs when manually inserting a student)
    specified_position = request.data.get(
        "position"
    )  # Assuming position can be passed in the request
    if specified_position is not None:
        position = int(specified_position)
    else:
        position = None

    # Create the new waitlist student and save
    waitlisted_student = WaitlistedStudent.objects.create(
        user=user, section=section, course=course, position=position
    )
    waitlisted_student.save()

    log_enroll_result(True, request.user, section)
    return Response(status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
def drop(request, pk=None):
    """
    Endpoint: /api/waitlist/<pk>/drop

    PATCH: Drop a student off the waitlist. Pass in section ID
    - sets to inactive

    """
    user = request.user
    section = Section.objects.get(pk=pk)
    course = section.mentor.course
    waitlisted_student = WaitlistedStudent.objects.filter(
        user=user, section=section
    ).first()

    # Check that the user has permissions to drop this student
    is_coordinator = course.is_coordinator(user)
<<<<<<< HEAD
    if waitlisted_student.user != user and not is_coordinator:
        raise PermissionDenied("You do not have permission to drop this student from the waitlist")
=======
    if not waitlisted_student or waitlisted_student.user != user and not is_coordinator:
        raise PermissionDenied(
            "You do not have permission to drop this student from the waitlist"
        )
>>>>>>> e980d2e (tests drops from waitlist)

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
        logger.info("<Waitlist:Success> User %s enrolled into Waitlist for Section %s", user, section)
    else:
        logger.warning("<Waitlist:Failure> User %s not enroll in Waitlist for Section %s: %s", user, section, reason)