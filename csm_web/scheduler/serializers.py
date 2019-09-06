from rest_framework import serializers
from django.utils import timezone, dateparse
from datetime import datetime
from .models import Attendance, Course, Student, Section, Mentor, Override, Spacetime


class CourseSerializer(serializers.ModelSerializer):
    enrollment_open = serializers.SerializerMethodField()

    def get_enrollment_open(self, obj):
        return obj.enrollment_start < timezone.now() < obj.enrollment_end

    class Meta:
        model = Course
        fields = ("id", "name", "enrollment_open")


class MentorSerializer(serializers.ModelSerializer):
    name = serializers.CharField()
    email = serializers.EmailField(source='user.email')

    class Meta:
        model = Mentor
        fields = ("name", "email")


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
        fields = ("id", "name", "email", "attendances")


class SectionSerializer(serializers.ModelSerializer):
    time = serializers.SerializerMethodField()
    location = serializers.CharField(source='spacetime.location')
    num_students_enrolled = serializers.IntegerField(source='current_student_count')
    mentor = MentorSerializer()

    def get_time(self, obj):
        return f"{obj.spacetime.day_of_week} {obj.spacetime.start_time.strftime('%I:%M %p')}-{obj.spacetime.end_time.strftime('%I:%M %p')}"

    class Meta:
        model = Section
        fields = ("id", "time", "location", "mentor", "capacity", "num_students_enrolled", "description", "mentor")


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
        value['day_of_week'] = Spacetime.DAY_OF_WEEK_CHOICES[override_datetime.weekday()][0]
        value['start_time'] = override_datetime.time()
        value['date'] = override_datetime.date()
        return value

    def create(self, validated_data):
        spacetime = Spacetime.objects.create(_day_of_week=validated_data['day_of_week'],
                                             _location=validated_data['location'],
                                             _start_time=validated_data['start_time'],
                                             _duration=validated_data['overriden_spacetime'].duration)

        return Override.objects.create(date=validated_data['date'], overriden_spacetime=validated_data['overriden_spacetime'],
                                       spacetime=spacetime)

    def update(self, instance, validated_data):
        instance.date = validated_data['date']
        instance.spacetime._day_of_week = validated_data['day_of_week']
        instance.spacetime._location = validated_data['location']
        instance.spacetime._start_time = validated_data['start_time']
        instance.spacetime._duration = instance.overriden_spacetime.duration
        instance.spacetime.save()
        instance.save()
        return instance
