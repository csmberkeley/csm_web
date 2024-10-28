from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from ..models import (
    Section, 
    WaitlistedStudent
)

from ..serializers import WaitlistedStudentSerializer
from .utils import get_object_or_error, logger

DEFAULT_CAPACITY = 3

@api_view(["POST"])
def add(request, pk=None):
    """
    Endpoint: /api/waitlistedstudent/add

    POST: Add a new waitlist student. Similar to add student in Section
    - if waitlist is full, deny permission
    - if user cannot enroll in section, deny permission
    - if section is not full, enroll instead.
    """
    section = get_object_or_error(Section.objects, pk=pk)
    if not request.user.can_enroll_in_course(section.mentor.course):
        logger.info(
            "<Enrollment:Failure> User %s was unable to enroll in Waitlist for \
                Section %s because they are already involved in this course",
            request.user, section
            )
        raise PermissionDenied(
            "You are already either mentoring for this course or enrolled in a \
                section, or the course is closed for enrollment",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    if section.current_waitlist_count >= section.waitlist_capacity:
        logger.warning(
            "<Enrollment:Failure> User %s was unable to enroll in Waitlist for \
                Section %s because it was full", request.user, section,
        )
        raise PermissionDenied(
            "There is no space available in this section", status.HTTP_423_LOCKED
        )

    waitlisted_student_queryset = request.user.waitlistedstudent_set.filter(
        active=True, course=section.mentor.course, section=section.id
    )

    waitlisted_student_queryset_all = request.user.waitlistedstudent_set.filter(
        active=True, course=section.mentor.course
    )

    if waitlisted_student_queryset.count() == 1:
        logger.warning(
            "<Enrollment:Failure> User %s was unable to enroll in Waitlist for \
                Section %s because user is already enrolled in the waitlist for this"
            " section", request.user, section,
        )
        raise PermissionDenied(
            "You are already waitlisted in this section", status.HTTP_423_LOCKED

    if waitlisted_student_queryset_all.count() >= section.mentor.course.max_waitlist:
        logger.warning(
            "<Enrollment:Failure> User %s was unable to enroll in Waitlist for \
                Section %s because user is already enrolled in more than %s waitlist \
                sections", request.user, section, section.mentor.course.max_waitlist
        )
        raise PermissionDenied(
            "You are waitlisted in too many sections", status.HTTP_423_LOCKED
        )

    waitlisted_student = WaitlistedStudent.objects.create(
        user=request.user, section=section, course=section.mentor.course
    )

    logger.info(
        "<Enrollment:Success> User %s enrolled into Waitlist for Section %s",
        request.user, section
    )
    return Response(status=status.HTTP_201_CREATED)

@api_view(["PATCH"])
def drop(request, pk=None):
    """
    Endpoint: /api/waitlistedstudent/<pk>/add_from_waitlist

    PATCH: Drop a student off the waitlist
    - sets to inactive

    """
    waitlisted_student = WaitlistedStudent.objects.get(pk=pk)

    is_coordinator = waitlisted_student.course.coordinator_set.filter(
        user=request.user
    ).exists()
    if waitlisted_student.user != request.user and not is_coordinator:
        # Students can drop themselves, and Coordinators can drop students from their course
        # Mentors CANNOT drop their own students, or anyone else for that matter
        raise PermissionDenied("You do not have permission to add this student")

    waitlisted_student.active = False

    waitlisted_student.save()
    logger.info("<Drop> User %s dropped from Waitlist for Section %s", request.user, waitlisted_student.section)
    return Response(status=status.HTTP_204_NO_CONTENT)