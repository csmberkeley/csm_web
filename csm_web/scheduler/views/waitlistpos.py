import csv
from itertools import groupby

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.db.models import Count

from ..models import Section, Student, WaitlistPosition
from ..serializers import LabelSerializer


@api_view(['POST'])
def drop(request, waitlistpos_id):
    """
    Endpoint: /api/sections/waitlist/drop/
    POST: Drops ANY student from the waitlist.
        - coordinators only
        - request format: [{ "student": int, "section": int, }]
            - student is student id and section is section id
            - coodinator_drop is true
    POST: Drops a student from the waitlist.
        - for students to drop themselves
        - request format: [{ "student": int, "section": int, }]
            - student is student id and section is section id
            - coordinator_drop is false
    """
    if request.method == "POST":
        # parse request data
        student_id = request.data.get("student")
        section_id = request.data.get("section")

        # get actual data from the database
        section = Section.objects.get(id=section_id)
        course = section.course
        student = Student.objects.get(student_id)

        requestor = request.user

        # check if requestor is coordinator
        is_coordinator = course.coordinator_set.filter(user=requestor).exists()

        # drop the student from the waitlist
        if requestor == student or is_coordinator:
            WaitlistPosition.objects.filter(id=waitlistpos_id).delete()


@api_view(['POST'])
def waitlist(request, pk=None):
    """
    Endpoint: /api/sections/waitlist/add/
    POST: Enrolls a student on the waitlist
        - for students to enroll themselves on the waitlist
        - request format: [{ "student": int, "section": int, }]
    """
    if request.method == "POST":
        # parse request data
        student_id = request.data.get("student")
        section_id = request.data.get("section")

        # get actual data from the database
        section = Section.objects.get(id = section_id)
        student = Student.objects.get(student_id)
        course = student.course

        # prevent the student from joining the waitlist if they are already on 3 course waitlists
        section_count = WaitlistPosition.objects.filter(student=student).count()
        if section_count == 3:
            return Response(status=status.HTTP_409_CONFLICT)


        # prevent the student from joining the waitlist if the section waitlist is full
        waitlist_count = WaitlistPosition.objects.filter(section=section).count
        if waitlist_count == section.waitlist_capacity:
            return Response(status=status.HTTP_409_CONFLICT)
        
        # create waitlist position
        waitlistpos = WaitlistPosition.objects.create(
            section=section,
            student=student,
        )

        # return response
        return Response(status=status.HTTP_201_CREATED)

        
