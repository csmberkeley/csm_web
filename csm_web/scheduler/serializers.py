from rest_framework import serializers
from .models import User, Attendance, Course, Profile, Section, Spacetime, Override


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "valid_until", "enrollment_start", "enrollment_end")


# Serializer Stubs


class SpacetimeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Spacetime
        fields = ("location", "start_time", "duration", "day_of_week")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email")


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ("id", "section", "week_start", "presence", "attendee")


class SectionSerializer(serializers.ModelSerializer):
    default_spacetime = SpacetimeSerializer()

    class Meta:
        model = Section
        fields = ("course", "mentor", "default_spacetime", "capacity")


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("id", "leader", "course", "role", "user", "section")


class OverrideSerializer(serializers.ModelSerializer):
    spacetime = SpacetimeSerializer()

    class Meta:
        model = Override
        fields = ("spacetime", "week_start", "section")
