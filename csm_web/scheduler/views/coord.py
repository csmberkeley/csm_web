from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Section, Student, Mentor, Course
from scheduler.serializers import StudentSerializer, CoordStudentSerializer

from .utils import logger

@api_view(["GET"])
def view_students(request, pk=None):
    #pk = course id
    """
    Endpoint: /coord/<course id: int>/student/

    GET: view all students in course
    """

    is_coord = bool(
        Course.objects.get(pk=pk).coordinator_set.filter(user=request.user).count()
    )
    if not is_coord:
        raise PermissionDenied("You do not have permission to view the coordinator view.")

    students = Student.objects.filter(active = True, course = pk)
    
    #issue: blank counts as unexcused
    return Response(
        CoordStudentSerializer(
            students,
            many=True
        ).data
    )

def view_mentors(request, pk=None):
    """
    Endpoint: /coord/<course id: int>/mentor/

    GET: view all mentors in course
    """