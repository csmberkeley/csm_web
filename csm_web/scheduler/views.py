from django.shortcuts import get_object_or_404
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
    queryset = Course.objects.filter(valid_until__gte=timezone.now().date())

    @action(detail=True)
    def sections(self, request, pk=None):
        course = get_object_or_error(self.queryset, pk=pk)
        return Response(SectionSerializer(course.section_set.all(), many=True).data)


class SectionViewSet(*viewset_with('retrieve')):
    serializer_class = SectionSerializer

    def get_object(self):
        return get_object_or_error(self.get_queryset(), **self.kwargs)

    def get_queryset(self):
        mentor_sections = Section.objects.filter(mentor__user=self.request.user)
        student_sections = Section.objects.filter(students__user=self.request.user)
        return mentor_sections | student_sections

    @action(detail=True, methods=['get', 'put'])
    def students(self, request, pk=None):
        section = get_object_or_error(self.get_queryset(), pk=pk)
        if request.method == 'GET':
            return Response(StudentSerializer(section.students.filter(active=True), many=True).data)
        # PUT
        try:
            student = Student.objects.get(active=False, user=request.user)
            student.section = section
            student.active = True
            student.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Student.DoesNotExist:
            student = Student.objects.create(user=request.user, section=section)
            return Response({'id': student.id}, status=status.HTTP_201_CREATED)


class StudentViewSet(viewsets.GenericViewSet):
    serializer_class = StudentSerializer

    def get_queryset(self):
        own_profiles = Student.objects.filter(user=self.request.user)
        pupil_profiles = Student.objects.filter(section__mentor__user=self.request.user)
        return own_profiles | pupil_profiles

    @action(detail=True, methods=['patch'])
    def drop(self, request, pk=None):
        student = get_object_or_error(self.get_queryset(), pk=pk)
        student.active = False
        student.save()
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
            serializer.save()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


class ProfileViewSet(*viewset_with('list')):
    queryset = None
    serializer_class = None

    def list(self, request):
        student_profiles = StudentSerializer(request.user.student_set.all(), many=True).data
        mentor_profiles = MentorSerializer(request.user.mentor_set.all(), many=True).data
        return Response({'mentor_profiles': mentor_profiles, 'student_profiles': student_profiles})


class SpacetimeViewSet(viewsets.GenericViewSet):
    serializer_class = Spacetime

    def get_queryset(self):
        return Spacetime.objects.filter(section__mentor__user=self.request.user)

    @action(detail=True, methods=['put'])
    def override(self, request, pk=None):
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)
        if hasattr(spacetime, "override"):  # update
            serializer = OverrideSerializer(spacetime.override, data=request.data)
        else:  # create
            serializer = OverrideSerializer(data={'overriden_spacetime': spacetime, **request.data})
        if serializer.is_valid():
            serializer.save()
            return Response(status=status.HTTP_202_ACCEPTED)
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
