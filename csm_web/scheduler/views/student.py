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
from ..models import Student
from ..serializers import AttendanceSerializer, StudentSerializer
from ..email.email_utils import (email_coordinator_drop,
    email_student_drop,
    EmailFormattingError,
    NoEmailError,
    EmailAuthError,
    HttpError
)


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

        # Filter attendances and delete future attendances
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
        # Send drop email
        if is_coordinator:
            coordinator = student.course.coordinator_set.get(user=request.user)
            mentor = student.section.mentor
            try:
                email_coordinator_drop(student)
                logger.info(
                    f"<Drop Email:Success> Email for coord {coordinator} dropping student {student} sent"
                )
            except NoEmailError:
                logger.info(
                    f"<Drop Email:Failure> Email address for {student} or {mentor} not found"
                )
            except EmailFormattingError:
                logger.info(
                    f"<Drop Email:Failure> Email for coord {coordinator} dropping student {student} has not been formatted correctly for sending"
                )
            except EmailAuthError:
                logger.info(
                    f"<Drop Email:Failure> Cannot log into CSM email"
                )
            except HttpError:
                logger.info(
                    f"<Drop Email:Failure> Email for coord {coordinator} dropping student {student} failed to send"
                )
        else:
            mentor = student.section.mentor
            try:
                email_student_drop(student)
                logger.info(
                    f"<Drop Email:Success> Email for student {student} dropping section sent"
                )
            except NoEmailError:
                logger.info(
                    f"<Drop Email:Failure> Email address for {student} or {mentor} not found"
                )
            except EmailFormattingError:
                logger.info(
                    f"<Drop Email:Failure> Email for student {student} dropping section has not been formatted correctly for sending"
                )
            except EmailAuthError:
                logger.info(
                    f"<Drop Email:Failure> Cannot log into CSM email"
                )
            except HttpError:
                logger.info(
                    f"<Drop Email:Failure> Email for student {student} dropping section failed to send"
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
            serializer = AttendanceSerializer(
                attendance,
                data={
                    "student_id": student.id,
                    "student_name": student.name,
                    "student_email": student.user.email,
                    "presence": request.data["presence"],
                },
            )
        except ObjectDoesNotExist:
            logger.error(
                f"<Attendance:Failure> Could not record attendance for User {log_str(request.user)}, used non-existent attendance id {request.data['id']}"
            )
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if serializer.is_valid():
            attendance = serializer.save()
            logger.info(
                f"<Attendance:Success> Attendance {log_str(attendance)} recorded for User {log_str(request.user)}"
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        logger.error(
            f"<Attendance:Failure> Could not record attendance for User {log_str(request.user)}, errors: {serializer.errors}"
        )
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

