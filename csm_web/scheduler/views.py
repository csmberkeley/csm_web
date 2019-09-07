from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from .models import Course, Section, Student, Spacetime
from rest_framework import mixins
from .serializers import CourseSerializer, SectionSerializer, StudentSerializer, AttendanceSerializer, MentorSerializer, OverrideSerializer
from django.core.exceptions import ObjectDoesNotExist
import logging

logger = logging.getLogger(__name__)


def get_object_or_error(specific_queryset, **kwargs):
    """
    Look up an object by kwargs in specific_queryset. If it exists there,
    return it. If the object exists but is not within the scope of the specific_queryset,
    raise a permission error (403), otherwise if the object does not exist at all raise a 404.
    """
    try:
        return specific_queryset.get(**kwargs)
    except ObjectDoesNotExist:
        if get_object_or_404(specific_queryset.model.objects, **kwargs):
            raise PermissionDenied()


METHOD_MIXINS = {'list': mixins.ListModelMixin, 'create': mixins.CreateModelMixin,
                 'retrieve': mixins.RetrieveModelMixin, 'update': mixins.UpdateModelMixin,
                 'partial_update': mixins.UpdateModelMixin, 'destroy': mixins.DestroyModelMixin}


def viewset_with(*permitted_methods):
    assert all(method in METHOD_MIXINS for method in permitted_methods), "Unrecognized method for ViewSet"
    return list(set(mixin_class for method, mixin_class in METHOD_MIXINS.items() if method in permitted_methods)) + [viewsets.GenericViewSet]


class CourseViewSet(*viewset_with('list')):
    serializer_class = CourseSerializer

    def get_queryset(self):
        queryset = Course.objects.filter(valid_until__gte=timezone.now().date())
        if self.action == 'sections':
            queryset = queryset.filter(enrollment_start__lte=timezone.now(), enrollment_end__gt=timezone.now())
        return queryset

    @action(detail=True)
    def sections(self, request, pk=None):
        course = get_object_or_error(self.get_queryset(), pk=pk)
        return Response(SectionSerializer(course.section_set.all(), many=True).data)


class SectionViewSet(*viewset_with('retrieve')):
    serializer_class = SectionSerializer

    def get_object(self):
        return get_object_or_error(self.get_queryset(), **self.kwargs)

    def get_queryset(self):
        mentor_sections = Section.objects.filter(mentor__user=self.request.user)
        student_sections = Section.objects.filter(students__user=self.request.user)
        return (mentor_sections | student_sections).distinct()

    @action(detail=True, methods=['get', 'put'])
    def students(self, request, pk=None):
        section = get_object_or_error(self.get_queryset(), pk=pk)
        if request.method == 'GET':
            return Response(StudentSerializer(section.students.filter(active=True), many=True).data)
        # PUT
        with transaction.atomic():
            """
            We reload the section object for atomicity. Even though we do not update
            the section directly, any student trying to enroll must first acquire a lock on the
            desired section. This allows us to assume that current_student_count is correct.
            """
            section = Section.objects.select_for_update().get(pk=section.pk)
            if not request.user.can_enroll_in_course(section.course):
                raise PermissionDenied(
                    "You are already either mentoring for this course or enrolled in a section", status.HTTP_422_UNPROCESSABLE_ENTITY)

            if section.current_student_count >= section.capacity:
                logger.warn(
                    f"<Enrollment:Failure> User {request.user.pk} was unable to enroll in Section {section.pk} because it was full")
                raise PermissionDenied("There is no space available in this section", status.HTTP_423_LOCKED)
            try:  # Student dropped a section in this course and is now enrolling in a different one
                student = request.user.student_set.get(active=False, section__course=section.course)
                old_section_pk = student.section.pk
                student.section = section
                student.active = True
                student.save()
                logger.info(
                    "f<Enrollment:Success> User {request.user.pk} swapped into Section {section.pk} from Section {old_section_pk}")
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Student.DoesNotExist:  # Student is enrolling in this course for the first time
                student = Student.objects.create(user=request.user, section=section)
                logger.info(
                    "f<Enrollment:Success> User {request.user.pk} enrolled in Section {section.pk}")
                return Response({'id': student.id}, status=status.HTTP_201_CREATED)


class StudentViewSet(viewsets.GenericViewSet):
    serializer_class = StudentSerializer

    def get_queryset(self):
        own_profiles = Student.objects.filter(user=self.request.user)
        pupil_profiles = Student.objects.filter(section__mentor__user=self.request.user)
        return (own_profiles | pupil_profiles).distinct()

    @action(detail=True, methods=['patch'])
    def drop(self, request, pk=None):
        student = get_object_or_error(self.get_queryset(), pk=pk)
        student.active = False
        student.save()
        logger.info("<Drop> User {request.user.pk} dropped Section {student.section.pk}")
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get', 'put'])
    def attendances(self, request, pk=None):
        student = get_object_or_error(self.get_queryset(), pk=pk)
        if request.method == 'GET':
            return Response(AttendanceSerializer(student.attendance_set.all(), many=True).data)
        # PUT
        if student.user == self.request.user:
            raise PermissionDenied('You cannot record your own attendance (nice try)')
        try:  # update
            attendance = student.attendance_set.get(date=request.data['date'])
            serializer = AttendanceSerializer(attendance, data={'student': student.id, **request.data})
        except ObjectDoesNotExist:  # create
            serializer = AttendanceSerializer(data={'student': student.id, **request.data})
        if serializer.is_valid():
            attendance = serializer.save()
            logger.info("<Attendance:Success> Attendance {attendance.pk} recorded for User {request.user.pk}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        logger.error(
            "<Attendance:Failure> Could not record attendance for User {request.user.pk}, errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


class ProfileViewSet(*viewset_with('list')):
    queryset = None
    serializer_class = None

    def list(self, request):
        student_profiles = StudentSerializer(request.user.student_set.filter(active=True), many=True).data
        mentor_profiles = MentorSerializer(request.user.mentor_set.all(), many=True).data
        return Response({'mentor_profiles': mentor_profiles, 'student_profiles': student_profiles})


class SpacetimeViewSet(viewsets.GenericViewSet):
    serializer_class = Spacetime

    def get_queryset(self):
        return Spacetime.objects.filter(section__mentor__user=self.request.user)

    @action(detail=True, methods=['put'])
    def override(self, request, pk=None):
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)
        if spacetime.has_override():  # update
            serializer = OverrideSerializer(spacetime.override, data=request.data)
        else:  # create
            serializer = OverrideSerializer(data={'overriden_spacetime': spacetime, **request.data})
        if serializer.is_valid():
            override = serializer.save()
            logger.info(f"<Override:Success> Overrode Spacetime {spacetime.pk} with Override {override.pk}")
            return Response(status=status.HTTP_202_ACCEPTED)
        logger.error(f"<Override:Failure> Could not override Spacetime {spacetime.pk}, errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
