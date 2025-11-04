from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import CoordMentorSerializer, CoordStudentSerializer
from scheduler.views.utils import get_object_or_error
from scheduler.views.student import StudentViewSet

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

@api_view(["POST"])
def drop_students(request, pk):
    course = get_object_or_error(Course.objects, pk=pk)
    if not course.coordinator_set.filter(user=request.user).exists():
        raise PermissionDenied(
            "You do not have permission to view the coordinator view."
        )

    students_list = request.data.get("ids")
    if not isinstance(students_list, list):
        return Response({"error": "has to be a list of ID's"}, status=400)

    students_list = [int(i) for i in students_list]
    
    viewset = StudentViewSet()
    viewset.request = request

    valid_drops = []
    failed_drops = []

    for student_id in students_list:
        try:
            response = viewset.drop(request, pk=student_id)
            if response.status_code in (200, 204):
                valid_drops.append(student_id)
        except Exception:
            failed_drops.append(student_id)

    if not valid_drops:
        return Response({"error": "Failed to drop all students"}, status=400)
    
    if not failed_drops:
        return Response(status=200)

    return Response({
        "error": f"Failed to drop: {', '.join(map(str, failed_drops))}. "
                 f"Successfully dropped: {', '.join(map(str, valid_drops))}"
    }, status=200)

@api_view(["POST"])
def add_family(request, pk): 
    is_coord = bool(
        get_object_or_error(Course.objects, pk=pk)
        .coordinator_set.filter(user=request.user)
        .count()
    )
    if not is_coord:
        raise PermissionDenied(
            "You do not have permission to view the coordinator view."
        )
    print("FAMILY:", request.data["family"])

    # is_valid_student = Student.objects.filter(active=True, course=pk).filter(user=request.user).exists()
    mentor = Mentor.objects.filter(course=pk).filter(user=request.user).first()
    # is_valid_mentor = Mentor.objects.filter(course=pk).filter(user=request.user).exists()
    
    if mentor: 
        mentor.family = request.data["family"]
        mentor.save()
    
        return Response(f"Family {request.data["family"]} updated for user.", status=200)
    return Response(f"Family addition failed", status=400)


# must be coord, course should be passed in with request
# post/update
# url contains course
# data contains name of family being added
# check if family is there, if not, add to database
# course id should be in url