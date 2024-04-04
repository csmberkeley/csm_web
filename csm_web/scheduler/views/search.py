from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.models import Section, Student
from scheduler.serializers import SectionSerializer, StudentSerializer


@api_view(["GET"])
def get_sections_of_user(request):
    """
    Gets sections and associated students based on query parameters.

    Query Parameters:
    - `query`: (optional) Search query to filter sections and students by name or email.
    - `student_absences`: (optional) Filter students by num absences (exact int or int range).

    Returns:
    - JSON response containing sections matching the query, along with associated student details.

    Raises:
    - PermissionDenied: If user lacks permission to search sections.
    - HTTP 400 Bad Request: If neither query parameters provided,
                            or invalid value for `student_absences`.

    Note:
    - Only `query` provided: returns sections & students matching the query.
    - Only `student_absences` provided: returns sections & students filtered by absences.
    - Both `query` and `student_absences` provided: returns sections and students
                                                  filtered by both query and absences.
    """

    is_coordinator = bool(
        request.user.coordinator_set.filter(user=request.user).count()
    )
    if not is_coordinator:
        raise PermissionDenied(
            "You are not authorized to search through sections of this course."
        )

    query = request.query_params.get("query", "")
    student_absences = request.query_params.get("student_absences", None)

    if not query and student_absences is None:
        return Response(
            {"error": "Please provide a query"}, status=status.HTTP_400_BAD_REQUEST
        )

    sections = Section.objects.all()

    # Fetch courses associated with the user's coordinator role
    courses = request.user.coordinator_set.values_list("course", flat=True)

    # Filter sections based on the courses associated with the user's coordinator role
    sections = sections.filter(mentor__course__in=courses)

    if query:
        sections = sections.filter(
            # pylint: disable-next=unsupported-binary-operation
            Q(students__user__first_name__icontains=query)
            | Q(students__user__last_name__icontains=query)
            | Q(students__user__email__icontains=query)
            | Q(mentor__user__first_name__icontains=query)
            | Q(mentor__user__last_name__icontains=query)
            | Q(mentor__user__email__icontains=query)
        ).distinct()

        students = (
            Student.objects.filter(
                # pylint: disable-next=unsupported-binary-operation
                Q(user__first_name__icontains=query)
                | Q(user__last_name__icontains=query)
                | Q(user__email__icontains=query),
                section__in=sections,
            )
            .distinct()
            .annotate(
                num_absences=Count("attendance", filter=Q(attendance__presence="UN"))
            )
        )
        student_query_results = students

    if student_absences is not None:
        try:
            # Check if the query is a range or single number
            if "-" in student_absences:
                start, end = student_absences.split("-")
                students = (
                    Student.objects.annotate(
                        num_absences=Count(
                            "attendance", filter=Q(attendance__presence="UN")
                        )
                    )
                    .filter(
                        num_absences__gte=start,
                        num_absences__lte=end,
                        section__in=sections,
                    )
                    .distinct()
                )
            else:
                num_absences = int(student_absences)
                students = (
                    Student.objects.annotate(
                        num_absences=Count(
                            "attendance", filter=Q(attendance__presence="UN")
                        )
                    )
                    .filter(num_absences=num_absences, section__in=sections)
                    .distinct()
                )
            sections = sections.filter(students__in=students).distinct()
        except ValueError:
            return Response(
                {
                    "error": (
                        "Invalid value for student_absences. Please provide an integer"
                        " or an integer range of format start-end."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        student_absences_results = students

    if query and student_absences:
        # Filter students based on query
        students = student_query_results.intersection(student_absences_results)

    section_serializer = SectionSerializer(
        sections, many=True, context={"request": request}
    )

    student_data = []
    for student in students:
        # attendance_data = student.attendance.filter(presence="UN")
        student_serializer = StudentSerializer(student)
        student_data.append(
            {
                "id": student_serializer.data["id"],
                "name": student_serializer.data["name"],
                "email": student_serializer.data["email"],
                "section": student_serializer.data["section"],
                "mentor": student.section.mentor.user.get_full_name(),
                "num_absences": student.num_absences,
            }
        )

    combined_data = {
        "sections": section_serializer.data,
        "students": student_data,
    }

    return Response(combined_data, status=status.HTTP_200_OK)
