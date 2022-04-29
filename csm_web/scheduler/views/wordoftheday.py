from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.decorators import api_view
from django.utils import timezone
import datetime
import re

from ..models import Student, SectionOccurrence, Attendance
from .utils import get_object_or_error

@api_view(['PUT'])
def submit(request, section_occurrence_pk):
    """
    Handles all submitting with regards to the word of the day. 
    If request.user is a mentor:
        Updates the word of the day to be 'word_of_the_day'
        Format of request
            request.data is a dictionary with
                'word_of_the_day': new word of the day
    If request.user is a student:
        Attempts to update the attendance for the student for the given section occurrence.
        Format of request
            request.data is a dictionary with
                'attempt': string of attempt for word of the day    
    """
    section_occurrence = get_object_or_error(SectionOccurrence.objects.all(), pk=section_occurrence_pk)
    student = Student.objects.filter(user=request.user, active=True, section=section_occurrence.section)
    is_mentor = section_occurrence.section.mentor.user == request.user
    is_coordinator = student.course.coordinator_set.filter(
            user=request.user
        ).exists()

    # Must be a student, mentor, or coordinator of the class to change anything
    if not (student.exists() or is_mentor or is_coordinator):
        raise PermissionDenied(detail='Must be a student, mentor, or coordinator of the section')

    if student.exists():
        request_time = timezone.now()

        section_occurrence_time_limit = datetime.datetime.combine(section_occurrence.date, datetime.datetime.min.time(), tzinfo=timezone.now().tzinfo) + datetime.timedelta(days=1)
        
        # Reject any requests made after the deadline (midnight the next day)
        if request_time > section_occurrence_time_limit:
            raise PermissionDenied(detail='Deadline passed')

        # If the attempt at the word of the day is incorrect, deny request
        if section_occurrence.word_of_the_day.lower() != request.data['attempt'].lower():
            raise PermissionDenied(detail='Incorrect word of the day')

        # Otherwise update the attendance to be present.
        attendance = Attendance.objects.filter(student=student, sectionOccurrence=section_occurrence).first()
        attendance.presence = "PR"
        attendance.save()

        return Response(status=status.HTTP_200_OK)
    
    elif is_mentor or is_coordinator:
        #Do not allow for empty word of the days or whitespace, if not empty then updates the word of the day for the section Occurrence
        if request.data['word_of_the_day'] == '':
            raise PermissionDenied(detail='Word of the day must be non empty')
        elif bool(re.search(r"\s", request.data['word_of_the_day'])):
            raise PermissionDenied(detail='Word of the day can not contain white space')
        else:
            section_occurrence.word_of_the_day = request.data['word_of_the_day'].lower()
            section_occurrence.save()
            return Response(status = status.HTTP_200_OK)
            
        
