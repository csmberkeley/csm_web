from rest_framework import serializers
from enum import Enum
from django.utils import timezone
from .models import Attendance, Course, Link, SectionOccurrence, User, Student, Section, Mentor, Override, Spacetime, Coordinator, DayOfWeekField, Resource, Worksheet, Label


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

# label serializer


class LabelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Label  # ???
        fields = ('id', 'course', 'sections', 'name', 'description', 'showPopup')


class CourseSerializer(serializers.ModelSerializer):
    enrollment_open = serializers.SerializerMethodField()
    user_can_enroll = serializers.SerializerMethodField()
    labels = LabelSerializer(many=True)

    def get_enrollment_open(self, obj):
        user = self.context.get('request') and self.context.get('request').user
        if user and user.priority_enrollment:
            now = timezone.now().astimezone(timezone.get_default_timezone())
            return user.priority_enrollment < now < obj.enrollment_end
        else:
            return obj.is_open()

    def get_user_can_enroll(self, obj):
        user = self.context.get('request') and self.context.get('request').user
        return user and user.can_enroll_in_course(obj)

    class Meta:
        model = Course
        fields = ("id", "name", "enrollment_start", "enrollment_open", "user_can_enroll", "labels")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "first_name", "last_name", "priority_enrollment")


class ProfileSerializer(serializers.Serializer):
    class VariableSourceCourseField(serializers.Field):
        def __init__(self, *args, **kwargs):
            self.target = kwargs.pop('target')
            super().__init__(self, *args, **kwargs)

        def to_representation(self, value):
            return getattr(value.course, self.target)

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
    date = serializers.DateField(source='sectionOccurrence.date', format="%b. %-d, %Y", read_only=True)
    student_name = serializers.CharField(source='student.name')
    student_id = serializers.IntegerField(source='student.id')
    student_email = serializers.CharField(source='student.user.email')

    class Meta:
        model = Attendance
        fields = ("id", "date", "presence", "student_name", "student_id", "student_email")
        extra_kwargs = {'student': {'write_only': True}}

    def update(self, instance, validated_data):
        # only update the attendance date
        instance.presence = validated_data.get('presence')
        instance.save()
        return instance


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
    course = serializers.CharField(source='mentor.course.name')
    course_title = serializers.CharField(source='mentor.course.title')
    user_role = serializers.SerializerMethodField()
    associated_profile_id = serializers.SerializerMethodField()
    # add labels
    queryset = Label.objects.filter()
    label_set = LabelSerializer(many=True)

    def get_num_students_enrolled(self, obj):
        return obj.num_students_annotation if hasattr(obj, 'num_students_annotation') else obj.current_student_count

    def user_associated_profile(self, obj):
        user = self.context.get('request') and self.context.get('request').user
        if not user:
            return
        try:
            return obj.students.get(user=user)
        except Student.DoesNotExist:
            coordinator = obj.mentor.course.coordinator_set.filter(user=user).first()
            if coordinator:
                return coordinator
            if obj.mentor and obj.mentor.user == user:
                return obj.mentor
        return None  # no profile

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
                  "num_students_enrolled", "description", "mentor", "course", "user_role", "course_title", "label_set")
    # will label_set get all labels associated with this section, or all labels that the course has?


class WorksheetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worksheet
        fields = ['id', 'name', 'resource', 'worksheet_file', 'solution_file']


class LinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = Link
        fields = ['id', 'name', 'resource', 'url']


class ResourceSerializer(serializers.ModelSerializer):
    worksheets = WorksheetSerializer(source='worksheet_set', many=True)
    links = LinkSerializer(source='link_set', many=True)

    class Meta:
        model = Resource
        fields = ['id', 'course', 'week_num', 'date', 'topics', 'worksheets', 'links']


class SectionOccurrenceSerializer(serializers.ModelSerializer):
    attendances = AttendanceSerializer(source='attendance_set', many=True)
    section = SectionSerializer()

    class Meta:
        model = SectionOccurrence
        fields = ('id', 'date', 'section', 'attendances')


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
