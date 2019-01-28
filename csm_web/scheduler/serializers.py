from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import User, Attendance, Course, Profile, Section, Spacetime, Override
from .permissions import is_leader
from itertools import groupby
from datetime import datetime


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "valid_until", "enrollment_start", "enrollment_end")


# Serializer Stubs


class SpacetimeSerializer(serializers.ModelSerializer):
    end_time = serializers.SerializerMethodField()
    day_of_week = serializers.SerializerMethodField()

    class Meta:
        model = Spacetime
        fields = ("location", "start_time", "day_of_week", "end_time")

    def get_end_time(self, obj):
        start_datetime = datetime(
            year=1,
            day=1,
            month=1,
            hour=obj.start_time.hour,
            minute=obj.start_time.minute,
            second=obj.start_time.second,
        )
        end_time = (start_datetime + obj.duration).time()
        return end_time

    def get_day_of_week(self, obj):
        return obj.get_day_of_week_display()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email")


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        fields = ("id", "section", "week_start", "presence", "attendee")


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ("id", "leader", "course", "role", "user", "section")


class SectionSerializer(serializers.ModelSerializer):
    default_spacetime = SpacetimeSerializer()
    mentor = ProfileSerializer()
    enrolled_students = serializers.SerializerMethodField()

    class Meta:
        model = Section
        fields = (
            "id",
            "course",
            "mentor",
            "default_spacetime",
            "capacity",
            "enrolled_students",
        )

    def get_enrolled_students(self, obj):
        return obj.active_students.count()


class OverrideSerializer(serializers.ModelSerializer):
    spacetime = SpacetimeSerializer()

    class Meta:
        model = Override
        fields = ("spacetime", "week_start", "section")

    def create(self, validated_data):
        default_spacetime = validated_data["section"].default_spacetime
        spacetime_data = validated_data["spacetime"]
        spacetime_data["duration"] = default_spacetime.duration
        spacetime = SpacetimeSerializer().create(spacetime_data)

        validated_data["spacetime"] = spacetime
        return super().create(validated_data)


class ActiveOverrideField(serializers.RelatedField):
    read_only = True

    def to_representation(self, value):
        overrides = value.all()

        # We want the latest override for this week

        weekday = timezone.now().weekday()
        current_week_start = timezone.now().date() - timedelta(days=weekday)
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
    students = serializers.PrimaryKeyRelatedField(
        source="active_students", many=True, read_only=True
    )
    course_name = serializers.SerializerMethodField()
    is_mentor = serializers.SerializerMethodField()
    attendances = serializers.SerializerMethodField()
    mentor = ProfileSerializer()

    class Meta:
        model = Section
        fields = (
            "id",
            "course_name",
            "mentor",
            "default_spacetime",
            "capacity",
            "active_override",
            "students",
            "is_mentor",
            "attendances",
        )

    def get_attendances(self, obj):
        if is_leader(self.context["request"].user, obj):
            nested_attendances = [
                [
                    (
                        student.user.first_name + " " + student.user.last_name,
                        attendance.week_start,
                        attendance.get_presence_display(),
                    )
                    for attendance in student.attendance_set.all()
                ]
                for student in obj.students.all()
            ]
            flat_attendances = [item for lst in nested_attendances for item in lst]
            flat_attendances.sort(key=lambda tuple: tuple[1])
            grouped_attendances = groupby(flat_attendances, key=lambda tuple: tuple[1])
            attendances = [
                {name: presence for name, week_start, presence in group}
                for key, group in grouped_attendances
            ]
            return attendances

    def get_course_name(self, obj):
        return obj.course.name

    def get_is_mentor(self, obj):
        return is_leader(
            self.context["request"].user, obj
        )  # obj.mentor in self.context["request"].user.profile_set.all()

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
