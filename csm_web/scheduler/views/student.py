from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db.models import Q
from django.utils import timezone
from scheduler.models import Attendance, SectionOccurrence
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
import datetime

from .utils import log_str, logger, get_object_or_error
from ..models import Student
from ..serializers import AttendanceSerializer, StudentSerializer


class StudentViewSet(viewsets.GenericViewSet):
    serializer_class = StudentSerializer

    def get_queryset(self):
        own_profiles = Student.objects.filter(user=self.request.user, active=True)
        pupil_profiles = Student.objects.filter(
            section__mentor__user=self.request.user, active=True
        )
        coordinator_student_profiles = Student.objects.filter(
            section__mentor__course__coordinator__user=self.request.user, active=True
        )
        return (own_profiles | pupil_profiles | coordinator_student_profiles).distinct()

    @action(detail=True, methods=["patch"])
    def drop(self, request, pk=None):
        student = get_object_or_error(self.get_queryset(), pk=pk)
        is_coordinator = student.course.coordinator_set.filter(
            user=request.user
        ).exists()
        if student.user != request.user and not is_coordinator:
            # Students can drop themselves, and Coordinators can drop students from their course
            # Mentors CANNOT drop their own students, or anyone else for that matter
            raise PermissionDenied("You do not have permission to drop this student")
        student.active = False
        if is_coordinator:
            student.banned = request.data.get("banned", False)
            if student.course.is_restricted and request.data.get("blacklisted", False):
                student.course.whitelist.remove(student.user)
        student.save()
        logger.info(
            f"<Drop> User {log_str(request.user)} dropped Section {log_str(student.section)} for Student user {log_str(student.user)}"
        )
        # filter attendances and delete future attendances
        now = timezone.now().astimezone(timezone.get_default_timezone())
        num_deleted, _ = student.attendance_set.filter(
            Q(
                sectionOccurrence__date__gte=now.date(),
                sectionOccurrence__section=student.section,
            )
        ).delete()
        logger.info(
            f"<Drop> Deleted {num_deleted} attendances for user {log_str(student.user)} in Section {log_str(student.section)} after {now.date()}"
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "put"])
    def attendances(self, request, pk=None):
        student = get_object_or_error(self.get_queryset(), pk=pk)
        if request.method == "GET":
            return Response(
                AttendanceSerializer(student.attendance_set.all(), many=True).data
            )
        # PUT
        if student.user == self.request.user:
            raise PermissionDenied("You cannot record your own attendance (nice try)")
        try:  # update
            attendance = student.attendance_set.get(pk=request.data["id"])
            presence = request.data["presence"]
            if presence not in ["PR", "UN", "EX"]:
                logger.error(
                    f"<Attendance:Failure> Could not record attendance for User {log_str(student)}, submitted invalid presence.")
                return Response(status=status.HTTP_400_BAD_REQUEST)
            attendance.presence = presence
            try:
                attendance.save()
                logger.info(
                    f"<Attendance:Success> Attendance {log_str(attendance)} recorded for User {log_str(request.user)}")
            except ValidationError:
                return Response(status=status.HTTP_422_UNPROCESSABLE_ENTITY)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ObjectDoesNotExist:
            logger.error(
                f"<Attendance:Failure> Could not record attendance for User {log_str(student)}, used non-existent attendance id {request.data['id']}"
            )
            return Response(status=status.HTTP_400_BAD_REQUEST)
