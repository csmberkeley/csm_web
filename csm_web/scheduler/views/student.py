from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Q
from django.utils import timezone
from scheduler.models import Attendance, SectionOccurrence
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

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

    @action(detail=True, methods=["put"])
    def submit_attendance(self, request, pk=None):
        """
        Attempts to change the attendance object associated with the 

        Format of request.
            request.data is a dictionary with
                'attempt': string of attempt for word of the day    
                '
        """
        # I think I only need the student and not if it has other profiles attached to it?
        student = get_object_or_error(self.get_queryset(), pk=pk)

        # So does the front end send which section occurence it is associated with?
        section_occurrence = SectionOccurrence.objects.filter(pk=request.data['sectionOccurence'])

        if section_occurrence.word_of_the_day != request.data['password'].lower():
            #Not sure which type of Http response to send, mayb permission denied?
            return Response(status=status.HTTP_403_FORBIDDEN)

        #I don't actually want to create a new attendance but rather update the already existing attendance.
        attendance = Attendance.objects.filter(student_id=student.pk).filter(sectionOccurrence_id=section_occurrence.pk)
        attendance.presence = "PR"
        attendance.save()

        return Response(status=status.HTTP_200_OK)