from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from .models import Course, Section, Student, Spacetime
from rest_framework import mixins
from .serializers import CourseSerializer, SectionSerializer, StudentSerializer, AttendanceSerializer, MentorSerializer, OverrideSerializer

METHOD_MIXINS = {'list': mixins.ListModelMixin, 'create': mixins.CreateModelMixin,
                 'retrieve': mixins.RetrieveModelMixin, 'update': mixins.UpdateModelMixin, 'partial_update': mixins.UpdateModelMixin, 'destroy': mixins.DestroyModelMixin}


def viewset_with(*permitted_methods):
    assert all(method in METHOD_MIXINS for method in permitted_methods)
    return list(set(mixin_class for method, mixin_class in METHOD_MIXINS.items() if method in permitted_methods)) + [viewsets.GenericViewSet]


class CourseViewSet(*viewset_with('list')):
    serializer_class = CourseSerializer
    queryset = Course.objects.filter(valid_until__gte=timezone.now().date())

    @action(detail=True)
    def sections(self, request, pk=None):
        course = get_object_or_404(self.queryset, pk=pk)
        return Response(SectionSerializer(course.section_set.all(), many=True).data)


class SectionViewSet(*viewset_with('retrieve')):
    serializer_class = SectionSerializer

    def get_queryset(self):
        mentor_sections = Section.objects.filter(mentor__user=self.request.user)
        student_sections = Section.objects.filter(students__user=self.request.user)
        return mentor_sections.union(student_sections)

    @action(detail=True, methods=['get', 'put'])
    def students(self, request, pk=None):
        section = get_object_or_404(self.queryset, pk=pk)
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
        return own_profiles.union(pupil_profiles)

    @action(detail=True, methods=['patch'])
    def drop(self, request, pk=None):
        student = get_object_or_404(self.queryset, pk=pk)
        student.active = False
        student.save()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get', 'post'])
    def attendances(self, request, pk=None):
        student = get_object_or_404(self.queryset, pk=pk)
        if request.method == 'GET':
            return Response(AttendanceSerializer(student.attendance_set.all(), many=True).data)
        # POST
        serializer = AttendanceSerializer(data={'student': student.id, **request.data})
        if serializer.is_valid():
            serializer.save()
            return Response(status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


class ProfileViewSet(*viewset_with('list')):
    queryset = None
    serializer_class = None

    def list(self, request):
        student_profiles = StudentSerializer(request.user.student_set.all(), many=True).data
        mentor_profiles = MentorSerializer(request.user.mentor_set.all(), many=True).data
        return Response({'mentor_profiles': mentor_profiles, 'student_profiles': student_profiles})


class SpacetimeViewSet(viewsets.GenericViewSet):
    serializer_class = None

    def get_queryset(self):
        return Spacetime.objects.filter(section__mentor__user=self.request.user)

    @action(detail=True, methods=['put'])
    def override(self, request, pk=None):
        spacetime = get_object_or_404(self.queryset, pk=pk)
        if hasattr(spacetime, "override"):
            serializer = OverrideSerializer(spacetime.override, data=request.data)
        else:
            serializer = OverrideSerializer(data={'overriden_spacetime': spacetime, **request.data})
        if serializer.is_valid():
            serializer.save()
            return Response(status=status.HTTP_202_ACCEPTED)
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
