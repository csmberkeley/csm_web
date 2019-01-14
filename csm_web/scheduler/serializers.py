from datetime import datetime, timedelta

from rest_framework import serializers
from .models import User, Attendance, Course, Profile, Section, Spacetime, Override
from .permissions import is_leader

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


class ActiveOverrideField(serializers.RelatedField):
    read_only = True

    def to_representation(self, value):
        overrides = value.all()

        # We want the latest override for this week

        weekday = datetime.now().weekday()
        current_week_start = datetime.now().date() - timedelta(days=weekday)
        current_week_end = current_week_start + timedelta(days=7)

        valid_set = overrides.filter(
            week_start__gte=current_week_start, week_start__lt=current_week_end
        )

        # Get the one created most recently
        first_valid_override = valid_set.order_by("-id").first()

        if len(valid_set) > 0:
            return OverrideSerializer(first_valid_override).data
        else:
            return None


class VerboseSectionSerializer(serializers.ModelSerializer):
    default_spacetime = SpacetimeSerializer()
    active_override = ActiveOverrideField(source="override_set", read_only=True)

    class Meta:
        model = Section
        fields = (
            "id",
            "course",
            "mentor",
            "default_spacetime",
            "capacity",
            "active_override",
            "students",
        )

    def to_representation(self, instance):
        # Serialize section with students only if leader is viewing
        user = self.context["request"].user

        if not is_leader(user, instance):
            self.fields.pop("students")

        return super().to_representation(instance)


class VerboseProfileSerializer(serializers.ModelSerializer):
    section = VerboseSectionSerializer()

    class Meta:
        model = Profile
        fields = ("id", "leader", "course", "role", "user", "section")
