from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import (
    CoordMentorSerializer,
    CoordStudentSerializer,
    FamilySerializer,
)
from scheduler.views.utils import get_object_or_error

from ..models import Course, Family, Mentor, Section, Student


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
def create_family(request, pk=None):
    """
    Endpoint: /coord/<course id: int>/family/create/
    pk = course id

    POST: Create a new family for this course.
    """
    # Verify coordinator permissions
    is_coord = bool(
        get_object_or_error(Course.objects, pk=pk)
        .coordinator_set.filter(user=request.user)
        .count()
    )
    if not is_coord:
        raise PermissionDenied("You do not have permission to create families.")

    # We add the course ID to the data so the family is tied to this specific course
    data = request.data.copy()
    data["course"] = pk

    serializer = FamilySerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["POST"])
def assign_family(request, pk=None):
    """
    Endpoint: /coord/<course id: int>/family/assign/
    pk = course id

    POST: Assign a mentor (or student) to a specific family.
    Expected payload: {"mentor_id": 123, "family_id": 4}
    """
    # Verify coordinator permissions
    is_coord = bool(
        get_object_or_error(Course.objects, pk=pk)
        .coordinator_set.filter(user=request.user)
        .count()
    )
    if not is_coord:
        raise PermissionDenied("You do not have permission to assign families.")

    mentor_id = request.data.get("mentor_id")
    family_id = request.data.get("family_id")

    if not mentor_id or not family_id:
        return Response({"error": "mentor_id and family_id are required."}, status=400)

    # Fetch the objects and ensure they exist
    mentor = get_object_or_error(Mentor.objects, pk=mentor_id)
    family = get_object_or_error(Family.objects, pk=family_id)

    # Security check: Ensure the mentor and family actually belong to the course the coord manages
    if mentor.course.id != pk or family.course.id != pk:
        raise PermissionDenied("Mentor or Family does not belong to this course.")

    # Assign the family to the mentor and save
    mentor.family = family
    mentor.save()

    return Response(
        {
            "message": f"Successfully assigned {mentor.user.first_name} to {family.name}."
        },
        status=200,
    )
