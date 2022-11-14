import csv
from itertools import groupby

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view

from ..models import Section, Student
from ..serializers import LabelSerializer


@api_view(['POST'])
def drop(request, label_id):
    """
    Endpoint: /api/sections/waitlist/drop/
    POST: Drops ANY student from the waitlist.
        - coordinators only
        - request format: [{ "student": int, "section": int }]
            - student is student id and section is section id
    POST: Drops a student from the waitlist.
    """
    if request.method == "POST":
        # parse request data
        student_id = request.data.get("student")
        section_id = request.data.get("section")

        section = Section.objects.get(id=section_id)
        course = section.course
        course.mentor_set.filter(user = request.user).exists()
        student = Student.objects.get(student_id)
