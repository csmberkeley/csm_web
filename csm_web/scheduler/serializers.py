from rest_framework import serializers
from enum import Enum
from django.utils import timezone
from .models import Attendance, Course, Student, Section, Mentor, Override, Spacetime, Coordinator, DayOfWeekField


class Role(Enum):
    COORDINATOR = "COORDINATOR"
    STUDENT = "STUDENT"
    MENTOR = "MENTOR"


def get_profile_role(profile):
    for role, klass in zip(Role, (Coordinator, Student, Mentor)):
        if isinstance(profile, klass):
            return role.value


def make_omittable(field_class, omit_key, *args, predicate=None, **kwargs):
    """
    Behaves exactly as if the field were defined directly by calling `field_class(*args, **kwargs)`,
    except that if `omit_key` is present in the context when the field is serialized and predicate returns True,
    the value is omitted and `None` is returned instead.

    Useful for when you want to leave out one or two fields in one view, while including them in
    another view, without having to go through the trouble of writing two completely separate serializers.
    This is a marked improvement over using a `SerializerMethodField` because this approach still allows
    writing to the field to work without any additional machinery.
    """
    predicate_provided = predicate is not None
    predicate = predicate or (lambda _: True)

    class OmittableField(field_class):
        def get_attribute(self, instance):
            """
            This is an important performance optimization that prevents us from hitting the DB for an
            unconditionally omitted field, as by the time to_representation is called, the DB has already been queried
            (because `value` has to come from *somewhere*).
            """
            return None if self.context.get(omit_key) and not predicate_provided else super().get_attribute(instance)

        def to_representation(self, value):
            return None if self.context.get(omit_key) and predicate(value) else super().to_representation(value)

    return OmittableField(*args, **kwargs)


class OverrideReadOnlySerializer(serializers.ModelSerializer):
    spacetime = serializers.SerializerMethodField()
    date = serializers.DateField(format="%b. %-d")

    def get_spacetime(self, obj):
        # Gets around cyclic dependency issue
        return SpacetimeSerializer(obj.spacetime, context={**self.context, 'omit_overrides': True}).data

    class Meta:
        model = Override
        fields = ("spacetime", "date")
        read_only_fields = ("spacetime", "date")


class SpacetimeSerializer(serializers.ModelSerializer):

    time = serializers.SerializerMethodField()
    location = make_omittable(serializers.CharField, 'omit_spacetime_links',
                              predicate=lambda location: location.startswith('http'))
    override = make_omittable(OverrideReadOnlySerializer, 'omit_overrides', read_only=True)

    def get_time(self, obj):
        if obj.start_time.strftime("%p") != obj.end_time.strftime("%p"):
            return f"{obj.day_of_week} {obj.start_time.strftime('%-I:%M %p')}-{obj.end_time.strftime('%-I:%M %p')}"
        return f"{obj.day_of_week} {obj.start_time.strftime('%-I:%M')}-{obj.end_time.strftime('%-I:%M %p')}"

    class Meta:
        model = Spacetime
        fields = ("start_time", "day_of_week", "time", "location", "id", "duration", "override")
        read_only_fields = ("time", "id", "override")


class CourseSerializer(serializers.ModelSerializer):
    enrollment_open = serializers.SerializerMethodField()
    user_can_enroll = serializers.SerializerMethodField()

    def get_enrollment_open(self, obj):
        return obj.enrollment_start < timezone.now() < obj.enrollment_end

    def get_user_can_enroll(self, obj):
        user = self.context.get('request') and self.context.get('request').user
        return user and user.can_enroll_in_course(obj)

    class Meta:
        model = Course
        fields = ("id", "name", "enrollment_open", "user_can_enroll")


class ProfileSerializer(serializers.Serializer):
    class VariableSourceCourseField(serializers.Field):
        def __init__(self, *args, **kwargs):
            self.target = kwargs.pop('target')
            super().__init__(self, *args, **kwargs)

        def to_representation(self, value):
            if isinstance(value, Coordinator):
                return getattr(value.course, self.target)
            return getattr(value.section.course, self.target)

    id = serializers.IntegerField()
    section_id = serializers.IntegerField(source='section.id', required=False)
    section_spacetimes = SpacetimeSerializer(source='section.spacetimes', many=True, required=False)
    course = VariableSourceCourseField(source='*', target='name', required=False)
    course_title = VariableSourceCourseField(source='*', target='title', required=False)
    course_id = VariableSourceCourseField(source='*', target='pk', required=False)
    role = serializers.SerializerMethodField()

    def get_role(self, obj):
        return get_profile_role(obj)


class MentorSerializer(serializers.ModelSerializer):
    email = make_omittable(serializers.EmailField, 'omit_mentor_emails', source='user.email')

    class Meta:
        model = Mentor
        fields = ("id", "name", "email", "section")


class AttendanceSerializer(serializers.ModelSerializer):
    date = serializers.DateField(format="%b. %-d, %Y", read_only=True)

    class Meta:
        model = Attendance
        fields = ("id", "presence", "date", "student")
        read_only_fields = ("date",)
        extra_kwargs = {'student': {'write_only': True}}


class StudentSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    attendances = AttendanceSerializer(source='attendance_set', many=True)

    class Meta:
        model = Student
        fields = ("id", "name", "email", "attendances", "section")


class SectionSerializer(serializers.ModelSerializer):
    spacetimes = SpacetimeSerializer(many=True)
    num_students_enrolled = serializers.SerializerMethodField()
    mentor = MentorSerializer()
    course = serializers.CharField(source='course.name')
    course_title = serializers.CharField(source='course.title')
    user_role = serializers.SerializerMethodField()
    associated_profile_id = serializers.SerializerMethodField()

    def get_num_students_enrolled(self, obj):
        return obj.num_students_annotation if hasattr(obj, 'num_students_annotation') else obj.current_student_count

    def user_associated_profile(self, obj):
        user = self.context.get('request') and self.context.get('request').user
        if not user:
            return
        try:
            return obj.students.get(user=user)
        except Student.DoesNotExist:
            if obj.mentor and obj.mentor.user == user:
                return obj.mentor
            coordinator = obj.course.coordinator_set.filter(user=user).first()
            return coordinator  # If coordinator is None we'd return None anyway at this point

    def get_user_role(self, obj):
        profile = self.user_associated_profile(obj)
        if not profile:
            return
        return get_profile_role(profile)

    def get_associated_profile_id(self, obj):
        profile = self.user_associated_profile(obj)
        return profile and profile.pk

    class Meta:
        model = Section
        fields = ("id", "spacetimes", "mentor", "capacity", "associated_profile_id",
                  "num_students_enrolled", "description", "mentor", "course", "user_role", "course_title")


class OverrideSerializer(serializers.ModelSerializer):
    location = serializers.CharField(source='spacetime.location')
    start_time = serializers.TimeField(source='spacetime.start_time')
    date = serializers.DateField()

    def create(self, validated_data):
        spacetime = Spacetime.objects.create(
            **validated_data['spacetime'], day_of_week=DayOfWeekField.DAYS[validated_data['date'].weekday()], duration=validated_data['overriden_spacetime'].duration)
        return Override.objects.create(date=validated_data['date'], overriden_spacetime=validated_data['overriden_spacetime'],
                                       spacetime=spacetime)

    def update(self, instance, validated_data):
        instance.date = validated_data['date']
        spacetime_data = validated_data['spacetime']
        instance.spacetime.day_of_week = DayOfWeekField.DAYS[validated_data['date'].weekday()]
        instance.spacetime.location = spacetime_data['location']
        instance.spacetime.start_time = spacetime_data['start_time']
        instance.spacetime.duration = instance.overriden_spacetime.duration
        instance.spacetime.save()
        instance.save()
        return instance

    class Meta:
        model = Override
        fields = ("location", "start_time", "date", "overriden_spacetime")
        extra_kwargs = {"overriden_spacetime": {'required': False}}
