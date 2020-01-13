from rest_framework import serializers
from django.utils import timezone, dateparse
from datetime import datetime
from .models import Attendance, Course, Student, Section, Mentor, Override, Spacetime, Profile


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
    section_spacetime = serializers.SerializerMethodField()
    course = serializers.CharField(source='section.course.name')
    course_title = serializers.CharField(source='section.course.title')
    is_student = serializers.SerializerMethodField()

    def get_is_student(self, obj):
        return isinstance(obj, Student)

    def get_section_spacetime(self, obj):
        if not (hasattr(obj, "section") and obj.section):
            return
        section = obj.section
        return f"{Spacetime.DayOfWeek(section.spacetime.day_of_week).label} {section.spacetime.start_time.strftime('%-I:%M')}-{section.spacetime.end_time.strftime('%-I:%M %p')}"


class MentorSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')

    class Meta:
        model = Mentor
        fields = ("id", "name", "email", "section")


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ("id", "presence", "week_start", "date", "student")
        read_only_fields = ("week_start",)
        extra_kwargs = {'student': {'write_only': True},
                        'date': {'write_only': True}}


class StudentSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email')
    attendances = AttendanceSerializer(source='attendance_set', many=True)

    class Meta:
        model = Student
        fields = ("id", "name", "email", "attendances", "section")


class SectionSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()
    location = serializers.CharField(source='spacetime.location')
    num_students_enrolled = serializers.IntegerField(source='current_student_count')
    mentor = MentorSerializer()
    course = serializers.CharField(source='course.name')

    def get_time(self, obj):
        return f"{obj.spacetime.get_day_of_week_display()} {obj.spacetime.start_time.strftime('%-I:%M')}-{obj.spacetime.end_time.strftime('%-I:%M %p')}"

    class Meta:
        model = Section
        fields = ("id", "time", "location", "mentor", "capacity",
                  "num_students_enrolled", "description", "mentor", "course")


class OverrideSerializer(serializers.Serializer):
    def to_representation(self, obj):
        rep = super().to_representation(obj)
        start_time = obj.spacetime.start_time
        rep['datetime'] = datetime(year=obj.date.year, month=obj.date.month, day=obj.date.day,
                                   hour=start_time.hour, minute=start_time.minute, second=start_time.second)
        rep['location'] = obj.spacetime.location
        return rep

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        override_datetime = dateparse.parse_datetime(data['datetime'])
        value['location'] = data['location']
        value['overriden_spacetime'] = data.get('overriden_spacetime')
        value['day_of_week'] = Spacetime.DayOfWeek.choices[override_datetime.weekday()][0]
        value['start_time'] = override_datetime.time()
        value['date'] = override_datetime.date()
        return value

    def create(self, validated_data):
        spacetime = Spacetime.objects.create(day_of_week=validated_data['day_of_week'],
                                             location=validated_data['location'],
                                             start_time=validated_data['start_time'],
                                             duration=validated_data['overriden_spacetime'].duration)

        return Override.objects.create(date=validated_data['date'], overriden_spacetime=validated_data['overriden_spacetime'],
                                       spacetime=spacetime)

    def update(self, instance, validated_data):
        instance.date = validated_data['date']
        instance.spacetime.day_of_week = validated_data['day_of_week']
        instance.spacetime.location = validated_data['location']
        instance.spacetime.start_time = validated_data['start_time']
        instance.spacetime.duration = instance.overriden_spacetime.duration
        instance.spacetime.save()
        instance.save()
        return instance
