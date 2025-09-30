from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Student
from ..serializers import AttendanceSerializer, StudentSerializer
from .section import add_from_waitlist
from .utils import get_object_or_error, log_str, logger


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
        """
        PATCH: /api/students/<pk>/drop

        Drops student from class
        - Turns inactive
        - Attempts to add from waitlist
        """
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
            "<Drop> User %s dropped Section %sfor Student user %s",
            request.user,
            student.section,
            student.user,
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
            "<Drop> Deleted %s attendances for user %s in Section %s after %s",
            num_deleted,
            log_str(student.user),
            log_str(student.section),
            now.date(),
        )
        add_from_waitlist(pk=student.section.id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "put"])
    def attendances(self, request, pk=None):
        """
        GET or PUT: /api/students/<pk>/attendances

        Endpoint to get or edit a student's attendance
        """
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
            logger.info(
                "<Attendance:Failure> Could not record attendance for user"
                "%s used non-existent attendance id %s",
                log_str(request.user),
                request.data["id"],
            )
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if serializer.is_valid():
            attendance = serializer.save()
            logger.info(
                "<Attendance:Success> Attendance %s recorded for user %s",
                log_str(attendance),
                log_str(request.user),
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        logger.info(
            "<Attendance:Failure> Could not record attendance for user %s errors: %s",
            log_str(request.user),
            serializer.errors,
        )
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
