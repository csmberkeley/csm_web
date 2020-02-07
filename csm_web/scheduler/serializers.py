from rest_framework import serializers
from enum import Enum
from django.utils import timezone
from .models import Attendance, Course, Student, Section, Mentor, Override, Spacetime, Coordinator


class SpacetimeReadOnlySerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()

    def get_time(self, obj):
        if obj.start_time.strftime("%p") != obj.end_time.strftime("%p"):
            return f"{obj.get_day_of_week_display()} {obj.start_time.strftime('%-I:%M %p')}-{obj.end_time.strftime('%-I:%M %p')}"
        return f"{obj.get_day_of_week_display()} {obj.start_time.strftime('%-I:%M')}-{obj.end_time.strftime('%-I:%M %p')}"

    class Meta:
        model = Spacetime
        fields = ("time", "location", "id")
        read_only_fields = ("time", "location", "id")


class SpacetimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spacetime
        fields = ("day_of_week", "start_time", "location")


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
    id = serializers.IntegerField()
    section_id = serializers.IntegerField(source='section.id')
    section_spacetime = SpacetimeReadOnlySerializer(source='section.spacetime')
    course = serializers.CharField(source='section.course.name')
    course_title = serializers.CharField(source='section.course.title')
    is_student = serializers.SerializerMethodField()

    def get_is_student(self, obj):
        return isinstance(obj, Student)


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
    spacetime = SpacetimeReadOnlySerializer()
    date = serializers.DateField(format="%b. %-d")

    class Meta:
        model = Override
        fields = ("spacetime", "date")
        read_only_fields = ("spacetime", "date")


class SectionSerializer(serializers.ModelSerializer):
    class Role(Enum):
        COORDINATOR = "COORDINATOR"
        STUDENT = "STUDENT"
        MENTOR = "MENTOR"

    spacetime = SpacetimeReadOnlySerializer()
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
        for role, klass in zip(self.Role, (Coordinator, Student, Mentor)):
            if isinstance(profile, klass):
                return role.value

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
