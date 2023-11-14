from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Student
from ..serializers import AttendanceSerializer, StudentSerializer
from .utils import get_object_or_error, logger


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
        Drops a student from a section.
        Students can drop themselves, and coordinators can drop students from their course.
        Mentors are unable to drop students from any course under any circumstances.
        Deletes futures attendances for the dropped student.
        """
        student = get_object_or_error(self.get_queryset(), pk=pk)
        is_coordinator = student.course.coordinator_set.filter(
            user=request.user
        ).exists()
        if student.user != request.user and not is_coordinator:
            raise PermissionDenied("You do not have permission to drop this student")
        student.active = False
        if is_coordinator:
            student.banned = request.data.get("banned", False)
            if student.course.is_restricted and request.data.get("blacklisted", False):
                student.course.whitelist.remove(student.user)
        student.save()

        logger.info(
            "<Drop> User %s dropped Section %s for Student user %s",
            request.user,
            student.section,
            student.user,
        )
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
            student.user,
            student.section,
            now.date(),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get", "put"])
    def attendances(self, request, pk=None):
        """
        Take attendance for a student.
        """
        student = get_object_or_error(self.get_queryset(), pk=pk)
        is_mentor = student.course.mentor_set.filter(user=request.user).exists()
        if request.method == "GET":
            return Response(
                AttendanceSerializer(student.attendance_set.all(), many=True).data
            )
        # PUT
        if not is_mentor:
            raise PermissionDenied(
                "You cannot record your own attendance (nice try) or your friend's. But"
                " seeing as you're familiar with our API Endpoints, you should apply to"
                " work for us!"
            )
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
                (
                    "<Attendance:FAILURE> Could not record attendance for User %s, used"
                    " non-existent attendance id %s"
                ),
                request.user,
                request.data["id"],
            )
            return Response(status=status.HTTP_400_BAD_REQUEST)

        if serializer.is_valid():
            attendance = serializer.save()
            logger.info(
                "<Attendance:Success> Attendance %s taken for User %s",
                attendance,
                request.user,
            )
            return Response(status=status.HTTP_204_NO_CONTENT)
        logger.error(
            "<Attendance:FAILURE> Could not record attendance for User %s, errors %s",
            request.user,
            serializer.errors,
        )
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
