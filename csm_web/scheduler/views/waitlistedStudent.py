from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import NotFound, PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import WaitlistedStudentSerializer
from scheduler.views.utils import get_object_or_error

from ..models import Section, Student, WaitlistedStudent
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

    section = get_object_or_error(Section.objects, pk=pk)
    course = section.mentor.course
    student = request.user

    # Checks that student is able to enroll in the course
    if not student.can_enroll_in_course(course):
        log_enroll_result(
            False,
            student,
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

    # If there is space in the section, attempt to enroll the student directly in the section
    if not section.is_section_full:
        return add_student(section, student)

    # If the waitlist is full, throw an error
    if section.is_waitlist_full:
        log_enroll_result(False, student, section, reason="Waitlist is full")
        raise PermissionDenied("There is no space available in this section.")

    # If user has waitlisted in the max number of waitlists allowed for the course
    if not student.can_enroll_in_waitlist(course):
        log_enroll_result(
            False,
            student,
            section,
            reason="User has waitlisted in max amount of waitlists for the course",
        )
        raise PermissionDenied(
            "You are waitlisted in the max amount of waitlists for this course."
        )

    # Check if the student is already enrolled in the waitlist for this section
    waitlist_queryset = WaitlistedStudent.objects.filter(
        active=True, section=section, user=student
    )
    if waitlist_queryset.count() != 0:
        log_enroll_result(
            False,
            student,
            section,
            reason="User is already waitlisted in this section",
        )
        raise PermissionDenied("You are already waitlisted in this section.")

    # Check if the waitlist student has a position (only occurs when manually inserting a student)
    specified_position = request.data.get("position", None)

    # Create the new waitlist student and save
    waitlisted_student = WaitlistedStudent.objects.create(
        user=student, section=section, course=course, position=specified_position
    )
    waitlisted_student.save()

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

    # TODO function not finished yet
    section = get_object_or_error(Section.objects, pk=pk)
    course = section.mentor.course
    user = request.user
    student = user

    is_coord = bool(
        section.mentor.course.coordinator_set.filter(user=request.user).count()
    )

    if not is_coord:  # check if it's a student
        raise PermissionDenied(
            "You must be a coord to perform this action.",
        )

    print(request.data)

    for email in request.data.emails:
        # data = request.data
        # email = data.get("email")
        if not email:  # singular student for now -- may need to adapt to a list
            return Response(
                {"error": "Must specify email of student to enroll"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        student_queryset = Student.objects.filter(
            course=section.mentor.course, user__email=email
        )  
        # course

        student = student_queryset.first().user
        print(student_queryset.count())
        # user is either a coord or a student
        # If there is space in the section, attempt to enroll the student directly
        if not section.is_section_full:
            return add_student(section, student)

        # If the waitlist is full, throw an error
        if section.is_waitlist_full:
            log_enroll_result(False, student, section, reason="Waitlist is full")
            raise PermissionDenied("There is no space available in this section.")

        # If user has waitlisted in the max number of waitlists allowed for the course
        if not student.can_enroll_in_waitlist(course):
            log_enroll_result(
                False,
                student,
                section,
                reason="User has waitlisted in max amount of waitlists for the course",
            )
            raise PermissionDenied(
                "You are waitlisted in the max amount of waitlists for this course."
            )

        # Check if the student is already enrolled in the waitlist for this section
        waitlist_queryset = WaitlistedStudent.objects.filter(
            active=True, section=section, user=student
        )
        if waitlist_queryset.count() != 0:
            log_enroll_result(
                False,
                student,
                section,
                reason="User is already waitlisted in this section",
            )
            raise PermissionDenied("You are already waitlisted in this section.")

        # Check if the waitlist student has a position 
        # (only occurs when manually inserting a student)
        specified_position = request.data.get("position", None)

        # Create the new waitlist student and save
        waitlisted_student = WaitlistedStudent.objects.create(
            user=student, section=section, course=course, position=specified_position
        )
        waitlisted_student.save()

    log_enroll_result(True, request.user, section)
    return Response(status=status.HTTP_201_CREATED)


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
    return Response(section.current_waitlist_count())
