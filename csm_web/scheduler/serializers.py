from rest_framework import serializers
from enum import Enum
from django.utils import timezone
from datetime import datetime
from .models import (
    Attendance,
    Course,
    Student,
    Section,
    Mentor,
    MentorBioInfo,
    Override,
    Spacetime,
    Coordinator,
    User
)


class Role(Enum):
    COORDINATOR = "COORDINATOR"
    STUDENT = "STUDENT"
    MENTOR = "MENTOR"


def get_profile_role(profile):
    for role, klass in zip(Role, (Coordinator, Student, Mentor)):
        if isinstance(profile, klass):
            return role.value


class SpacetimeSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    def get_time(self, obj):
        if obj.start_time.strftime("%p") != obj.end_time.strftime("%p"):
            return f"{obj.get_day_of_week_display()} {obj.start_time.strftime('%-I:%M %p')}-{obj.end_time.strftime('%-I:%M %p')}"
        return f"{obj.get_day_of_week_display()} {obj.start_time.strftime('%-I:%M')}-{obj.end_time.strftime('%-I:%M %p')}"

    class Meta:
        model = Spacetime
        fields = ("start_time", "day_of_week", "time", "location", "id", "duration")
        read_only_fields = ("time", "id")


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
    section_spacetime = SpacetimeSerializer(source='section.spacetime', required=False)
    course = VariableSourceCourseField(source='*', target='name', required=False)
    course_title = VariableSourceCourseField(source='*', target='title', required=False)
    course_id = VariableSourceCourseField(source='*', target='pk', required=False)
    role = serializers.SerializerMethodField()

    def get_role(self, obj):
        return get_profile_role(obj)


class MentorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')

    class Meta:
        model = Mentor
        fields = ("id", "name", "email", "section")


class AttendanceSerializer(serializers.ModelSerializer):
    week_start = serializers.DateField(format="%b. %-d, %Y", read_only=True)

    class Meta:
        model = Attendance
        fields = ("id", "presence", "week_start", "student")
        read_only_fields = ("week_start",)
        extra_kwargs = {'student': {'write_only': True}}


class StudentSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    attendances = AttendanceSerializer(source='attendance_set', many=True)

    class Meta:
        model = Student
        fields = ("id", "name", "email", "attendances", "section")


class OverrideReadOnlySerializer(serializers.ModelSerializer):
    spacetime = SpacetimeSerializer()
    date = serializers.DateField(format="%b. %-d")

    class Meta:
        model = Override
        fields = ("spacetime", "date")
        read_only_fields = ("spacetime", "date")


class SectionSerializer(serializers.ModelSerializer):
    spacetime = SpacetimeSerializer()
    num_students_enrolled = serializers.IntegerField(source='current_student_count')
    mentor = MentorSerializer()
    course = serializers.CharField(source='course.name')
    course_title = serializers.CharField(source='course.title')
    user_role = serializers.SerializerMethodField()
    override = OverrideReadOnlySerializer(source='spacetime.override')
    associated_profile_id = serializers.SerializerMethodField()

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
        fields = ("id", "spacetime", "mentor", "capacity", "override", "associated_profile_id",
                  "num_students_enrolled", "description", "mentor", "course", "user_role", "course_title")


class OverrideSerializer(serializers.ModelSerializer):
    location = serializers.CharField(source='spacetime.location')
    start_time = serializers.TimeField(source='spacetime.start_time')
    date = serializers.DateField()

    def create(self, validated_data):
        spacetime = Spacetime.objects.create(
            **validated_data['spacetime'], day_of_week=Spacetime.DayOfWeek.values[validated_data['date'].weekday()], duration=validated_data['overriden_spacetime'].duration)
        return Override.objects.create(date=validated_data['date'], overriden_spacetime=validated_data['overriden_spacetime'],
                                       spacetime=spacetime)

    def update(self, instance, validated_data):
        instance.date = validated_data['date']
        spacetime_data = validated_data['spacetime']
        instance.spacetime.day_of_week = Spacetime.DayOfWeek.values[validated_data['date'].weekday()]
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


class MentorBioInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = MentorBioInfo
        fields = ("user", "first_name", "last_name", "biography", "pfp")
