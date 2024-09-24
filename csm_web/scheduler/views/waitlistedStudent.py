from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone
from scheduler.models import Attendance, SectionOccurrence
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
import datetime

from .utils import log_str, logger, get_object_or_error
from ..models import WaitlistedStudent, Student
from ..serializers import WaitlistedStudentSerializer

class WaitlistedStudentViewSet(viewsets.GenericViewSet):
    serializer_class = WaitlistedStudentSerializer

    # need to add "drop" method for when a waitlisted student drops the section / is dropped from the section

    @action(detail=True, methods=["patch"])
    def add(self, request, pk=None):
        waitlisted_student = get_object_or_error(self.get_queryset(), pk=pk)
        is_coordinator = waitlisted_student.course.coordinator_set.filter(
            user=request.user
        ).exists()
        if waitlisted_student.user != request.user and not is_coordinator:
            # Students can drop themselves, and Coordinators can drop students from their course
            # Mentors CANNOT drop their own students, or anyone else for that matter
            raise PermissionDenied("You do not have permission to add this student")
        
        student = Student.objects.create(
            section = waitlisted_student.section,
        )
        waitlisted_student.active = False

        student.save()
        waitlisted_student.save()
        logger.info(
            f"<Add> User {log_str(request.user)} Section {log_str(student.section)} for Waitlisted Student user {log_str(student.user)}"
        )
        return Response(status=status.HTTP_204_NO_CONTENT)