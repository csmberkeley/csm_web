from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import CoordMentorSerializer, CoordStudentSerializer
from scheduler.views.utils import get_object_or_error

from ..models import Course, Mentor, Section, Student


@api_view(["GET"])
def view_students(request, pk=None):
    """
    Endpoint: /coord/<course id: int>/student/
    pk = course id

    GET: view all students in course
    """

    is_coord = bool(
        get_object_or_error(Course.objects, pk=pk)
        .coordinator_set.filter(user=request.user)
        .count()
    )
    if not is_coord:
        raise PermissionDenied(
            "You do not have permission to view the coordinator view."
        )

    students = Student.objects.filter(active=True, course=pk).order_by(
        "user__first_name"
    )

    return Response(CoordStudentSerializer(students, many=True).data)


@api_view(["GET"])
def view_mentors(request, pk=None):
    """
    Endpoint: /coord/<course id: int>/mentor/
    pk= course id

    GET: view all mentors in course
    """

    is_coord = bool(
        get_object_or_error(Course.objects, pk=pk)
        .coordinator_set.filter(user=request.user)
        .count()
    )
    if not is_coord:
        raise PermissionDenied(
            "You do not have permission to view the coordinator view."
        )

    mentors = Mentor.objects.filter(course=pk).order_by("user__first_name")
    return Response(CoordMentorSerializer(mentors, many=True).data)


@api_view(["DELETE"])
def delete_section(request, pk):
    """
    Endpoint: /coord/<section id: int>/section
    pk = section id

    Delete a section and all associated spacetimes and overrides.
    """
    section = get_object_or_error(Section.objects, pk=pk)
    is_coord = bool(
        section.mentor.course.coordinator_set.filter(user=request.user).count()
    )
    if not is_coord:
        raise PermissionDenied(
            "You do not have permission to view the coordinator view."
        )

    # Delete the section itself, will cascade and delete everything else
    section.delete()
    return Response(status=204)
