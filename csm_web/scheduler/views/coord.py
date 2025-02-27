from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import CoordMentorSerializer, CoordStudentSerializer

from ..models import Course, Mentor, Student


@api_view(["GET"])
def view_students(request, pk=None):
    # pk = course id
    """
    Endpoint: /coord/<course id: int>/student/

    GET: view all students in course
    """

    is_coord = bool(
        Course.objects.get(pk=pk).coordinator_set.filter(user=request.user).count()
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

    GET: view all mentors in course
    """

    is_coord = bool(
        Course.objects.get(pk=pk).coordinator_set.filter(user=request.user).count()
    )
    if not is_coord:
        raise PermissionDenied(
            "You do not have permission to view the coordinator view."
        )

    mentors = Mentor.objects.filter(course=pk).order_by("user__first_name")
    print(mentors)
    return Response(CoordMentorSerializer(mentors, many=True).data)
