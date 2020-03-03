import logging
from operator import attrgetter
from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from django.db.models import Q, Case, When, Value, PositiveSmallIntegerField, Count
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
    # Used to sort sections in the order that the days are listed in Spacetime.DayOfWeek (i.e. Monday, Tuesday, ... )
    SPACETIME_DAY_SORT = Case(*(When(spacetime__day_of_week=day, then=Value(key))
                                for key, day in enumerate(Spacetime.DayOfWeek.values)), output_field=PositiveSmallIntegerField())

    def get_queryset(self):
        banned_from = self.request.user.student_set.filter(banned=True).values_list('section__course__id', flat=True)
        now = timezone.now()
        return Course.objects.exclude(pk__in=banned_from).filter(
            Q(valid_until__gte=now.date(), enrollment_start__lte=now, enrollment_end__gt=now) | Q(coordinator__user=self.request.user)).distinct()

    def get_sections_by_day(self, course):
        sections = course.section_set.all().annotate(day_key=self.SPACETIME_DAY_SORT)
        section_count_by_day = sections.values('spacetime__day_of_week').order_by(
            'day_key').annotate(num_sections=Count('id'))
        """
        Use list to force evaluation of the QuerySet so that the below for loop doesn't trigger a DB query on each iteration

        Further explanation: 
        Slicing an unevaluated QuerySet returns another unevaluated QuerySet (except when the step parameter is used but that's not relevant here).
        So if we did *not* call list on the below line, then in the for loop below, each slice of sections (i.e. sections[ ... : ... ]) would be an unevaluated
        QuerySet, which would then be evaluated (by way of performing a database query) when passed to SectionSerializer. Thus we'd make up to 7 (one for each day of the week)
        *separate database queries* each time this endpoint was hit. This would be terrible for performance, so instead we call list, which evaluates the entire QuerySet with
        a single database query, and then the slices in the for loop are just simple native Python list slices.
        """
        sections = list(sections.select_related('spacetime', 'spacetime___override', 'mentor', 'mentor__user').annotate(
            num_students_annotation=Count('students', filter=Q(students__active=True))).order_by('day_key', 'spacetime__start_time'))
        start, sections_by_day = 0, {}
        for group in section_count_by_day:
            sections_by_day[group['spacetime__day_of_week']] = SectionSerializer(
                sections[start:start + group['num_sections']], many=True).data
            start += group['num_sections']
        return sections_by_day

    @action(detail=True)
    def sections(self, request, pk=None):
        course = get_object_or_error(self.get_queryset(), pk=pk)
        sections_by_day = self.get_sections_by_day(course)
        return Response({'userIsCoordinator': course.coordinator_set.filter(user=request.user).exists(), 'sections': sections_by_day})


class SectionViewSet(*viewset_with('retrieve', 'partial_update', 'create')):
    serializer_class = SectionSerializer

    def get_object(self):
        return get_object_or_error(self.get_queryset(), **self.kwargs)

    def get_queryset(self):
        banned_from = self.request.user.student_set.filter(banned=True).values_list('section__course__id', flat=True)
        return Section.objects.exclude(course__pk__in=banned_from).filter(
            Q(mentor__user=self.request.user) | Q(students__user=self.request.user) | Q(course__coordinator__user=self.request.user)).distinct()

    def create(self, request):
        course = get_object_or_error(Course.objects.all(
        ), pk=request.data['course_id'], coordinator__user=self.request.user)
        mentor_user, _ = User.objects.get_or_create(
            email=self.request.data['mentor_email'], username=self.request.data['mentor_email'].split('@')[0])
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
                    user, _ = User.objects.get_or_create(
                        email=request.data['email'], username=request.data['email'].split('@')[0])
                    student = Student.objects.create(user=user, section=section)
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
        is_coordinator = student.section.course.coordinator_set.filter(user=request.user).exists()
        if student.user != request.user and not is_coordinator:
            # Students can drop themselves, and Coordinators can drop students from their course
            # Mentors CANNOT drop their own students, or anyone else for that matter
            raise PermissionDenied("You do not have permission to drop this student")
        student.active = False
        if is_coordinator:
            student.banned = request.data.get('banned', False)
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
        return Response(ProfileSerializer([*request.user.student_set.filter(active=True, banned=False), *request.user.mentor_set.exclude(section=None), *request.user.coordinator_set.all()], many=True).data)


class SpacetimeViewSet(viewsets.GenericViewSet):
    serializer_class = Spacetime

    def get_queryset(self):
        return Spacetime.objects.filter(Q(section__mentor__user=self.request.user) | Q(section__course__coordinator__user=self.request.user)).distinct()

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
