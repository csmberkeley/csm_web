from rest_framework import serializers
from .models import Attendance, Course, Profile, Section, Spacetime, Override


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "valid_until", "enrollment_start", "enrollment_end")


# Serializer Stubs


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ("id", "section", "week_start", "presence", "attendee")


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("id", "leader", "course", "role", "user", "section")


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ("course", "mentor", "default_spacetime", "capacity")


class SpacetimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spacetime
        fields = ("location", "start_time", "duration", "day_of_week")


class OverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = Override
        fields = ("spacetime", "week_start", "section")
