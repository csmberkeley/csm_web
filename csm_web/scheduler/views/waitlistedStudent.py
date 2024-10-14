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
    Add a new waitlist student. Similar to add student in Section
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
        )

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
    Drop a student off the waitlist
    """

    waitlisted_student = get_object_or_error(WaitlistedStudent.objects, pk=pk)

    is_coordinator = waitlisted_student.section.mentor.course.coordinator_set.filter(
        user=request.user
    ).exists()
    if waitlisted_student.user != request.user and not is_coordinator:
        raise PermissionDenied("You do not have permission to drop this student")

    waitlisted_student.active = False

    waitlisted_student.save()
    logger.info("<Drop> User %s dropped from Waitlist for Section %s", request.user, waitlisted_student.section)
    return Response(status=status.HTTP_204_NO_CONTENT)