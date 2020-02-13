from itertools import groupby
import logging
from operator import attrgetter
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Q
from django.db.models.query import EmptyQuerySet
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from .models import Course, Section, Student, Spacetime, User, Override, Attendance, Mentor
from .serializers import (
    CourseSerializer,
    SectionSerializer,
    StudentSerializer,
    AttendanceSerializer,
    OverrideSerializer,
    ProfileSerializer,
    SpacetimeSerializer,
)

logger = logging.getLogger(__name__)

logger.info = logger.warn


def log_str(obj):
    def log_format(*args):
        return '<' + ';'.join(f'{attr}={attrgetter(attr)(obj)}' for attr in args) + '>'
    try:
        if isinstance(obj, User):
            return log_format('pk', 'email')
        if isinstance(obj, Section):
            return log_format('pk', 'course.name', 'spacetime.location', 'spacetime.start_time')
        if isinstance(obj, Spacetime):
            return log_format('pk', 'section.course.name', 'location', 'start_time')
        if isinstance(obj, Override):
            return log_format('pk', 'date', 'spacetime.pk')
        if isinstance(obj, Attendance):
            return log_format('pk', 'date', 'presence')
    except Exception as error:
        logger.error(f"<Logging> Exception while logging: {error}")
        return ''


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
        now = timezone.now()
        return (Course.objects.filter(valid_until__gte=now.date(), enrollment_start__lte=now, enrollment_end__gt=now) | Course.objects.filter(coordinator__user=self.request.user))

    @action(detail=True)
    def sections(self, request, pk=None):
        course = get_object_or_error(self.get_queryset(), pk=pk)
        # TODO: Clean this up
        sections_by_day = dict(sorted(((day, SectionSerializer(group, many=True).data) for day, group in groupby(
            course.section_set.all().order_by('spacetime__day_of_week', 'spacetime__start_time'),
            lambda section: section.spacetime.day_of_week)), key=lambda pair: Spacetime.DAY_INDEX.index(pair[0])))
        return Response({'userIsCoordinator': bool(course.coordinator_set.filter(user=self.request.user).count()), 'sections': sections_by_day})


class SectionViewSet(*viewset_with('retrieve', 'partial_update', 'create')):
    serializer_class = SectionSerializer

    def get_object(self):
        return get_object_or_error(self.get_queryset(), **self.kwargs)

    def get_queryset(self):
        return Section.objects.filter(Q(mentor__user=self.request.user) | Q(students__user=self.request.user) | Q(course__coordinator__user=self.request.user)).distinct()

    def create(self, request):
        course = get_object_or_error(Course.objects.all(
        ), pk=request.data['course_id'], coordinator__user=self.request.user)
        mentor_user = get_object_or_error(User.objects.all(), email=self.request.data['mentor_email'])
        spacetime = SpacetimeSerializer(
            data={**self.request.data['spacetime'], 'duration': str(course.section_set.first().spacetime.duration)})
        if spacetime.is_valid():
            spacetime = spacetime.save()
        else:
            return Response({'error': f"Spacetime was invalid {spacetime.errors}", status: status.HTTP_422_UNPROCESSABLE_ENTITY})
        mentor = Mentor.objects.create(user=mentor_user)
        Section.objects.create(spacetime=spacetime, mentor=mentor,
                               description=self.request.data['description'], capacity=self.request.data['capacity'], course=course)
        return Response(status=status.HTTP_201_CREATED)

    def partial_update(self, request, pk=None):
        section = get_object_or_error(self.get_queryset(), pk=pk)
        if not section.course.coordinator_set.filter(user=self.request.user).count():
            raise PermissionDenied("Only coordinators can change section metadata")
        serializer = self.serializer_class(section, data={'capacity': request.data.get(
            'capacity'), 'description': request.data.get('description')}, partial=True)
        if serializer.is_valid():
            section = serializer.save()
            logger.info(f"<Section:Meta:Success> Updated metadata on section {log_str(section)}")
            return Response(status=status.HTTP_202_ACCEPTED)
        else:
            logger.info(f"<Section:Meta:Failure> Failed to update metadata on section {log_str(section)}")
            return Response(status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    @action(detail=True, methods=['get', 'put'])
    def students(self, request, pk=None):
        if request.method == 'GET':
            section = get_object_or_error(self.get_queryset(), pk=pk)
            return Response(StudentSerializer(section.students.filter(active=True), many=True).data)
        # PUT
        with transaction.atomic():
            """
            We reload the section object for atomicity. Even though we do not update
            the section directly, any student trying to enroll must first acquire a lock on the
            desired section. This allows us to assume that current_student_count is correct.
            """
            section = get_object_or_error(Section.objects, pk=pk)
            section = Section.objects.select_for_update().get(pk=section.pk)
            is_coordinator = bool(section.course.coordinator_set.filter(user=request.user).count())
            if is_coordinator and not request.data.get('email'):
                return Response({'error': 'Must specify email of student to enroll'}, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
            if not (request.user.can_enroll_in_course(section.course) or is_coordinator):
                logger.warn(
                    f"<Enrollment:Failure> User {log_str(request.user)} was unable to enroll in Section {log_str(section)} because they are already involved in this course")
                raise PermissionDenied(
                    "You are already either mentoring for this course or enrolled in a section", status.HTTP_422_UNPROCESSABLE_ENTITY)

            if section.current_student_count >= section.capacity:
                logger.warn(
                    f"<Enrollment:Failure> User {log_str(request.user)} was unable to enroll in Section {log_str(section)} because it was full")
                raise PermissionDenied("There is no space available in this section", status.HTTP_423_LOCKED)
            try:  # Student dropped a section in this course and is now enrolling in a different one
                if is_coordinator:
                    student = Student.objects.get(active=False, section__course=section.course,
                                                  user__email=request.data['email'])
                else:
                    student = request.user.student_set.get(active=False, section__course=section.course)
                old_section = student.section
                student.section = section
                student.active = True
                student.save()
                logger.info(
                    f"<Enrollment:Success> User {log_str(student.user)} swapped into Section {log_str(section)} from Section {log_str(old_section)}")
                return Response(status=status.HTTP_204_NO_CONTENT)
            except Student.DoesNotExist:  # Student is enrolling in this course for the first time
                if is_coordinator:
                    student = Student.objects.create(user=User.objects.get(
                        email=request.data['email']), section=section)
                else:
                    student = Student.objects.create(user=request.user, section=section)
                logger.info(
                    f"<Enrollment:Success> User {log_str(student.user)} enrolled in Section {log_str(section)}")
                return Response({'id': student.id}, status=status.HTTP_201_CREATED)


class StudentViewSet(viewsets.GenericViewSet):
    serializer_class = StudentSerializer

    def get_queryset(self):
        own_profiles = Student.objects.filter(user=self.request.user, active=True)
        pupil_profiles = Student.objects.filter(section__mentor__user=self.request.user, active=True)
        coordinator_student_profiles = Student.objects.filter(
            section__course__coordinator__user=self.request.user, active=True)
        return (own_profiles | pupil_profiles | coordinator_student_profiles).distinct()

    @action(detail=True, methods=['patch'])
    def drop(self, request, pk=None):
        student = get_object_or_error(self.get_queryset(), pk=pk)
        if student.user != self.request.user and not student.section.course.coordinator_set.filter(user=self.request.user).count():
            # Students can drop themselves, and Coordinators can drop students from their course
            # Mentors CANNOT drop their own students, or anyone else for that matter
            raise PermissionDenied("You do not have permission to drop this student")
        student.active = False
        student.save()
        logger.info(f"<Drop> User {log_str(request.user)} dropped Section {log_str(student.section)}")
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
            attendance = student.attendance_set.get(pk=request.data['id'])
            serializer = AttendanceSerializer(
                attendance, data={'student': student.id, 'presence': request.data['presence']})
        except ObjectDoesNotExist:
            logger.error(
                f"<Attendance:Failure> Could not record attendance for User {log_str(request.user)}, used non-existent attendance id {request.data['id']}")
        if serializer.is_valid():
            attendance = serializer.save()
            logger.info(
                f"<Attendance:Success> Attendance {log_str(attendance)} recorded for User {log_str(request.user)}")
            return Response(status=status.HTTP_204_NO_CONTENT)
        logger.error(
            f"<Attendance:Failure> Could not record attendance for User {log_str(request.user)}, errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


class ProfileViewSet(*viewset_with('list')):
    serializer_class = None
    queryset = EmptyQuerySet

    def list(self, request):
        return Response(ProfileSerializer([*request.user.student_set.filter(active=True), *request.user.mentor_set.exclude(section=None), *request.user.coordinator_set.all()], many=True).data)


class SpacetimeViewSet(viewsets.GenericViewSet):
    serializer_class = Spacetime

    def get_queryset(self):
        return Spacetime.objects.filter(Q(section__mentor__user=self.request.user) | Q(section__course__coordinator__user=self.request.user))

    @action(detail=True, methods=['put'])
    def modify(self, request, pk=None):
        """Permanently modifies a spacetime, ignoring the override field."""
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)
        serializer = SpacetimeSerializer(spacetime, data=request.data, partial=True)
        if serializer.is_valid():
            new_spacetime = serializer.save()
            logger.info(
                f"<Spacetime:Success> Modified Spacetime {log_str(new_spacetime)} (previously {log_str(spacetime)})")
            return Response(status=status.HTTP_202_ACCEPTED)
        logger.error(
            f"<Spacetime:Failure> Could not modify Spacetime {log_str(spacetime)}, errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    @action(detail=True, methods=['put'])
    def override(self, request, pk=None):
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)
        if hasattr(spacetime, "_override"):  # update
            serializer = OverrideSerializer(spacetime._override, data=request.data)
            status_code = status.HTTP_202_ACCEPTED
        else:  # create
            serializer = OverrideSerializer(data={'overriden_spacetime': spacetime.pk, **request.data})
            status_code = status.HTTP_201_CREATED
        if serializer.is_valid():
            override = serializer.save()
            logger.info(f"<Override:Success> Overrode Spacetime {log_str(spacetime)} with Override {log_str(override)}")
            return Response(status=status_code)
        logger.error(
            f"<Override:Failure> Could not override Spacetime {log_str(spacetime)}, errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)


class UserViewSet(*viewset_with('list')):
    serializer_class = None
    queryset = User.objects.all()

    def list(self, request):
        return Response(self.queryset.values_list('email', flat=True))
