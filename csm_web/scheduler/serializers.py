from enum import Enum

from django.utils import timezone
from rest_framework import serializers

from .models import (
    Attendance,
    Coordinator,
    Course,
    DayOfWeekField,
    Link,
    Matcher,
    MatcherPreference,
    MatcherSlot,
    Mentor,
    Override,
    Resource,
    Section,
    SectionOccurrence,
    Spacetime,
    Student,
    User,
    WaitlistedStudent,
    Worksheet,
    day_to_number,
)


class Role(Enum):
    COORDINATOR = "COORDINATOR"
    STUDENT = "STUDENT"
    MENTOR = "MENTOR"
    WAITLIST = "WAITLIST"


def get_profile_role(profile):
    """Return role (enum) depending on the profile type"""
    if isinstance(profile, Coordinator):
        return Role.COORDINATOR.value
    elif isinstance(profile, Student):
        return Role.STUDENT.value
    elif isinstance(profile, Mentor):
        return Role.MENTOR.value
    elif isinstance(profile, WaitlistedStudent):
        return Role.WAITLIST.value
    return None


def make_omittable(field_class, omit_key, *args, predicate=None, **kwargs):
    """
    Behaves exactly as if the field were defined directly by calling `field_class(*args, **kwargs)`,
    except that if `omit_key` is present in the context when the field is serialized and predicate
    returns True, the value is omitted and `None` is returned instead.

    Useful for when you want to leave out one or two fields in one view, while including them in
    another view, without having to go through the trouble of writing two completely separate
    serializers.
    This is a marked improvement over using a `SerializerMethodField` because this approach
    still allows writing to the field to work without any additional machinery.
    """
    predicate_provided = predicate is not None
    predicate = predicate or (lambda _: True)

    class OmittableField(field_class):
        def get_attribute(self, instance):
            """
            This is an important performance optimization that prevents us from hitting the DB
            for an unconditionally omitted field, as by the time to_representation is called,
            the DB has already been queried (because `value` has to come from *somewhere*).
            """
            return (
                None
                if self.context.get(omit_key) and not predicate_provided
                else super().get_attribute(instance)
            )

        def to_representation(self, value):
            """Override to return None if key is omitted"""
            return (
                None
                if self.context.get(omit_key) and predicate(value)
                else super().to_representation(value)
            )

    return OmittableField(*args, **kwargs)


class OverrideReadOnlySerializer(serializers.ModelSerializer):
    spacetime = serializers.SerializerMethodField()
    date = serializers.DateField(format="%b. %-d")

    def get_spacetime(self, obj):
        """Retrieve the serialized spacetime object associated with the override"""
        # Gets around cyclic dependency issue
        return SpacetimeSerializer(
            obj.spacetime, context={**self.context, "omit_overrides": True}
        ).data

    class Meta:
        model = Override
        fields = ("spacetime", "date")
        read_only_fields = ("spacetime", "date")


class SpacetimeSerializer(serializers.ModelSerializer):
    duration = serializers.SerializerMethodField()
    day_of_week = serializers.SerializerMethodField()
    location = make_omittable(
        serializers.CharField,
        "omit_spacetime_links",
        predicate=lambda location: location.startswith("http"),
    )
    override = make_omittable(
        OverrideReadOnlySerializer, "omit_overrides", read_only=True
    )

    def get_duration(self, obj):
        """Serialize the duration field (timedelta) as a number in seconds"""
        return obj.duration.total_seconds()

    def get_day_of_week(self, obj):
        """Serialize the weekday field (string) as an ISO weekday"""
        # day_to_number converts with Monday = 0, whereas ISO uses Monday = 1
        return day_to_number(obj.day_of_week) + 1

    class Meta:
        model = Spacetime
        fields = (
            "start_time",
            "day_of_week",
            "location",
            "id",
            "duration",
            "override",
        )
        read_only_fields = ("time", "id", "override")


class CourseSerializer(serializers.ModelSerializer):
    enrollment_open = serializers.SerializerMethodField()
    user_can_enroll = serializers.SerializerMethodField()

    def get_enrollment_open(self, obj):
        """Compute enrollment open time; takes priority enrollment into account"""
        user = self.context.get("request") and self.context.get("request").user
        if (
            user
            and user.priority_enrollment
            and user.priority_enrollment < obj.enrollment_start
        ):
            now = timezone.now().astimezone(timezone.get_default_timezone())
            return user.priority_enrollment < now < obj.enrollment_end

        return obj.is_open()

    def get_user_can_enroll(self, obj):
        """Determine whether the user can currently enroll in the course"""
        user = self.context.get("request") and self.context.get("request").user
        return user and user.can_enroll_in_course(obj)

    class Meta:
        model = Course
        fields = (
            "id",
            "name",
            "enrollment_start",
            "enrollment_open",
            "user_can_enroll",
            "is_restricted",
            "word_of_the_day_limit",
        )


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "priority_enrollment")


class ProfileSerializer(serializers.Serializer):  # pylint: disable=abstract-method
    class VariableSourceCourseField(
        serializers.Field
    ):  # pylint: disable=abstract-method
        def __init__(self, **kwargs):
            self.target = kwargs.pop("target")
            super().__init__(**kwargs)

        def to_representation(self, value):
            return getattr(value.course, self.target)

    id = serializers.IntegerField()
    section_id = serializers.IntegerField(source="section.id", required=False)
    section_spacetimes = SpacetimeSerializer(
        source="section.spacetimes", many=True, required=False
    )
    course = VariableSourceCourseField(source="*", target="name", required=False)
    course_title = VariableSourceCourseField(source="*", target="title", required=False)
    course_id = VariableSourceCourseField(source="*", target="pk", required=False)
    role = serializers.SerializerMethodField()

    def get_role(self, obj):
        """Retrieve the profile role"""
        return get_profile_role(obj)


class MentorSerializer(serializers.ModelSerializer):
    email = make_omittable(
        serializers.EmailField, "omit_mentor_emails", source="user.email"
    )

    class Meta:
        model = Mentor
        fields = ("id", "name", "email", "section")


class AttendanceSerializer(serializers.ModelSerializer):
    date = serializers.DateField(source="sectionOccurrence.date", read_only=True)
    student_name = serializers.CharField(source="student.name")
    student_id = serializers.IntegerField(source="student.id")
    student_email = serializers.CharField(source="student.user.email")
    word_of_the_day_deadline = serializers.SerializerMethodField()

    def get_word_of_the_day_deadline(self, obj):
        """Compute deadline for the word of the day."""
        limit = obj.sectionOccurrence.section.mentor.course.word_of_the_day_limit
        if limit is None:
            return None
        return obj.sectionOccurrence.date + limit

    class Meta:
        model = Attendance
        fields = (
            "id",
            "date",
            "presence",
            "student_name",
            "student_id",
            "student_email",
            "word_of_the_day_deadline",
        )
        extra_kwargs = {"student": {"write_only": True}}

    def update(self, instance, validated_data):
        # only update the attendance date
        instance.presence = validated_data.get("presence")
        instance.save()
        return instance


class StudentSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")
    attendances = AttendanceSerializer(source="attendance_set", many=True)

    class Meta:
        model = Student
        fields = ("id", "name", "email", "attendances", "section")


class WaitlistedStudentSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email")

    class Meta:
        model = WaitlistedStudent
        fields = ("id", "name", "email", "section", "position")


class SectionSerializer(serializers.ModelSerializer):
    spacetimes = SpacetimeSerializer(many=True)
    num_students_enrolled = serializers.SerializerMethodField()
    mentor = MentorSerializer()
    course = serializers.CharField(source="mentor.course.name")
    course_title = serializers.CharField(source="mentor.course.title")
    user_role = serializers.SerializerMethodField()
    associated_profile_id = serializers.SerializerMethodField()
    course_restricted = serializers.BooleanField(source="mentor.course.is_restricted")
    num_students_waitlisted = serializers.SerializerMethodField()

    def get_num_students_enrolled(self, obj):
        """Retrieve the number of students enrolled in the section"""
        return (
            obj.num_students_annotation
            if hasattr(obj, "num_students_annotation")
            else obj.current_student_count
        )

    def get_num_students_waitlisted(self, obj):
        """Retrieve the number of students waitlisted for the section"""
        return (
            obj.num_waitlisted_annotation
            if hasattr(obj, "num_waitlisted_annotation")
            else obj.current_waitlist_count
        )

    def user_associated_profile(self, obj):
        """Retrieve the user profile associated with the section"""
        user = self.context.get("request") and self.context.get("request").user
        if not user:
            return None
        try:
            return obj.students.get(user=user)
        except Student.DoesNotExist:
            waitlisted_student = obj.waitlist_set.filter(user=user).first()
            if waitlisted_student:
                return waitlisted_student
            coordinator = obj.mentor.course.coordinator_set.filter(user=user).first()
            if coordinator:
                return coordinator
            if obj.mentor and obj.mentor.user == user:
                return obj.mentor
        return None  # no profile

    def get_user_role(self, obj):
        """Retrieve the role of the associated user profile"""
        profile = self.user_associated_profile(obj)
        if not profile:
            return None
        return get_profile_role(profile)

    def get_associated_profile_id(self, obj):
        """Retrieve the id of the associated user profile"""
        profile = self.user_associated_profile(obj)
        return profile and profile.pk

    class Meta:
        model = Section
        fields = (
            "id",
            "spacetimes",
            "mentor",
            "capacity",
            "associated_profile_id",
            "num_students_enrolled",
            "description",
            "mentor",
            "course",
            "user_role",
            "course_title",
            "course_restricted",
            "waitlist_capacity",
            "num_students_waitlisted",
        )


class WorksheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worksheet
        fields = ["id", "name", "resource", "worksheet_file", "solution_file"]


class LinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Link
        fields = ["id", "name", "resource", "url"]


class ResourceSerializer(serializers.ModelSerializer):
    worksheets = WorksheetSerializer(source="worksheet_set", many=True)
    links = LinkSerializer(source="link_set", many=True)

    class Meta:
        model = Resource
        fields = ["id", "course", "week_num", "date", "topics", "worksheets", "links"]


class SectionOccurrenceSerializer(serializers.ModelSerializer):
    attendances = AttendanceSerializer(source="attendance_set", many=True)

    class Meta:
        model = SectionOccurrence
        fields = ("id", "date", "section", "attendances")


class OverrideSerializer(serializers.ModelSerializer):
    location = serializers.CharField(source="spacetime.location")
    start_time = serializers.TimeField(source="spacetime.start_time")
    date = serializers.DateField()

    def create(self, validated_data):
        spacetime = Spacetime.objects.create(
            **validated_data["spacetime"],
            day_of_week=DayOfWeekField.DAYS[validated_data["date"].weekday()],
            duration=validated_data["overriden_spacetime"].duration,
        )
        return Override.objects.create(
            date=validated_data["date"],
            overriden_spacetime=validated_data["overriden_spacetime"],
            spacetime=spacetime,
        )

    def update(self, instance, validated_data):
        instance.date = validated_data["date"]
        spacetime_data = validated_data["spacetime"]
        instance.spacetime.day_of_week = DayOfWeekField.DAYS[
            validated_data["date"].weekday()
        ]
        instance.spacetime.location = spacetime_data["location"]
        instance.spacetime.start_time = spacetime_data["start_time"]
        instance.spacetime.duration = instance.overriden_spacetime.duration
        instance.spacetime.save()
        instance.save()
        return instance

    class Meta:
        model = Override
        fields = ("location", "start_time", "date", "overriden_spacetime")
        extra_kwargs = {"overriden_spacetime": {"required": False}}


class MatcherSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matcher
        fields = ("id", "course", "assignment", "is_open")


class MatcherSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatcherSlot
        fields = ["id", "matcher", "times", "description"]


class MatcherPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatcherPreference
        fields = ["slot", "mentor", "preference"]
