from django.db.models import Count, Q
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from django.urls import reverse
from django.db import transaction
from django.contrib import messages
from django import forms

from scheduler.models import (
    User,
    Attendance,
    Course,
    Student,
    Mentor,
    Coordinator,
    Section,
    Spacetime,
    Override,
)

admin.site.register(Coordinator)

# Helper methods


def get_admin_link_for(obj_property, reverse_path, display_text=None):
    """
    Returns embeddable HTML for an admin URL to the specified property.
    obj_property should be the object that was looked up, e.g. "obj.user" should be passed
    rather than "user".
    If display_text is provided, then uses the provided str of obj_property as the URL text.
    """
    admin_url = reverse(
        reverse_path, args=(obj_property.id,)
    )
    return format_html(
        '<a style="display: block" href="{}">{}</a>',
        admin_url,
        display_text or obj_property
    )


def get_visible_courses(user):
    """
    Returns a list of Course objects that the request's user can see.
    """
    if user.is_superuser:
        return Course.objects.all()
    else:
        return Coordinator.objects.filter(user=user).values_list("course")


def is_user_admin(user):
    return user.is_superuser or user.is_staff


class CoordAdmin(admin.ModelAdmin):
    def has_permission(self, request, obj=None):
        return is_user_admin(request.user)

    has_view_permission = has_add_permission = has_change_permission = has_delete_permission = has_module_permission = has_permission


# Custom views


@admin.register(User)
class UserAdmin(CoordAdmin):
    fields = ("username", "email", "first_name", "last_name")
    search_fields = ("email",)
    list_display = ("name", "email")
    list_filter = ("is_active",)

    def name(self, obj):
        if obj.first_name and obj.last_name:
            return f"{obj.first_name} {obj.last_name}"
        else:
            return obj.username

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Student)
class StudentAdmin(CoordAdmin):
    list_filter = ("active", "section__course")
    list_display = ("name", "get_email", "get_course", "get_mentor", "section")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    actions = ("drop_students", "undrop_students")
    autocomplete_fields = ("section", "user")

    def get_fields(self, request, obj):
        fields = ["name", "get_email", "get_course", "section", "get_attendances", "active"]
        # TODO distinguish between edit (which should have it read_only) and add
        fields.insert(4, "user")
        # fields.insert(4, "user" if request.user.is_superuser else "get_user")
        return fields

    def get_readonly_fields(self, request, obj):
        fields = ["get_course", "get_email", "name", "get_attendances"]
        # if not request.user.is_superuser:
        # fields.insert(0, "get_user")
        return fields

    def has_delete_permission(self, request, obj=None):
        return False  # drop students by deactivating their section

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "section":
            kwargs["queryset"] = Section.objects.filter(course__in=get_visible_courses(request.user))
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related("user", "section__course", "section__mentor")
        if request.user.is_superuser:
            return queryset
        return queryset.filter(section__course__in=get_visible_courses(request.user))

    def drop_students(self, request, queryset):
        queryset.update(active=False)

    drop_students.short_description = (
        "Drop student(s) from a section. This action is reversible, but it is still strongly "
        "recommended that you double check the name/email/section/course first."
    )

    def undrop_students(self, request, queryset):
        queryset.update(active=True)

    undrop_students.short_description = "Re-enroll student(s) in the section they were previously dropped from."

    # Custom fields

    def get_email(self, obj):
        return obj.user.email

    get_email.short_description = "Email"

    def get_user(self, obj):
        return get_admin_link_for(obj.user, "admin:scheduler_user_change")

    get_user.short_description = "User"

    # TODO handle nullable section
    def get_course(self, obj):
        return get_admin_link_for(obj.section.course, "admin:scheduler_course_change")

    get_course.short_description = "Course"

    def get_mentor(self, obj):
        if obj.section is not None and obj.section.mentor is not None:
            return get_admin_link_for(obj.section.mentor, "admin:scheduler_mentor_change")
        return "-"

    get_mentor.short_description = "Mentor"

    def get_attendances(self, obj):
        attendance_links = sorted(
            get_admin_link_for(
                attendance,
                "admin:scheduler_attendance_change",
                f"Date {attendance.date}: {attendance.presence or '--'}"
            ) for attendance in obj.attendance_set.all()
        )
        return format_html("".join(attendance_links))

    get_attendances.short_description = "Attendances"


@admin.register(Mentor)
class MentorAdmin(CoordAdmin):
    fields = ("name", "get_email", "get_course", "user", "get_section", "get_students")
    readonly_fields = ("get_course", "get_email", "get_section", "name", "get_students")
    list_filter = ("section__course",)
    list_display = ("name", "get_email", "get_course", "get_section")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    actions = ("deactivate_profiles", "activate_profiles")
    autocomplete_fields = ("user",)

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # delete sections + mentor by deleting sections, drop by deactivating

    def get_queryset(self, request):
        queryset = (
            super()
            .get_queryset(request)
            .select_related("user", "section__course")
            .prefetch_related("section__students")
        )
        if request.user.is_superuser:
            return queryset
        return queryset.filter(section__course__in=get_visible_courses(request.user))

    # Custom fields

    def get_email(self, obj):
        return obj.user.email

    get_email.short_description = "Email"

    def get_user(self, obj):
        return get_admin_link_for(obj.user, "admin:scheduler_user_change")

    get_user.short_description = "User"

    # TODO handle nullable section
    def get_section(self, obj):
        return get_admin_link_for(obj.section, "admin:scheduler_section_change")

    get_section.short_description = "Section"

    def get_course(self, obj):
        return get_admin_link_for(obj.section.course, "admin:scheduler_course_change")

    get_course.short_description = "Course"

    def get_students(self, obj):
        student_links = sorted(
            get_admin_link_for(
                student,
                "admin:scheduler_student_change",
            ) for student in obj.section.students.all()
        )
        return format_html("".join(student_links))

    get_students.short_description = "Students"


class SectionForm(forms.ModelForm):

    def __init__(self, *args, **kwargs):
        user = kwargs.pop("user")
        super().__init__(*args, **kwargs)
        queryset = Section.objects.filter(course__in=get_visible_courses(user))
        self.queryset = (
            queryset
            .select_related("mentor__user")
            .prefetch_related("students")
        )
        fields = self.fields
        if self.instance.pk is not None:
            spacetime = self.instance.spacetime
            has_mentor = self.instance.mentor is not None
            fields["mentor_name"].initial = self.instance.mentor.name if has_mentor else "-"
            fields["mentor_email"].initial = self.instance.mentor.user.email if has_mentor else "-"
            fields["mentor_profile_id"].initial = self.instance.mentor.pk if has_mentor else "-"
            fields["location"].initial = spacetime._location
            fields["start_time"].initial = spacetime._start_time
            fields["duration"].initial = spacetime._duration
            fields["day_of_week"].initial = spacetime._day_of_week
            fields["students"].initial = "\n".join(str(student) for student in self.instance.students.all())
        else:
            for field in ("mentor_name", "mentor_email", "mentor_profile_id", "students"):
                fields[field].widget = forms.HiddenInput()

    mentor_name = forms.CharField(required=False, disabled=True)
    mentor_email = forms.CharField(required=False, disabled=True)
    mentor_profile_id = forms.CharField(required=False, disabled=True)
    spacetime = forms.ModelChoiceField(required=False, queryset=Spacetime.objects.all(), widget=forms.HiddenInput())
    location = forms.CharField(max_length=100)
    start_time = forms.TimeField()
    duration = forms.DurationField(
        help_text="Enter a value of the form 'hh:mm:ss', e.g. '01:30:00' for a 1.5 hour section."
    )
    day_of_week = forms.ChoiceField(choices=Spacetime.DAY_OF_WEEK_CHOICES)
    students = forms.CharField(required=False, disabled=True, widget=forms.Textarea,
                               help_text="This field isn't actually editable. To add a student, enroll them through the Students admin page.")

    def clean(self):
        cleaned_data = super().clean()
        del cleaned_data["mentor_name"]
        del cleaned_data["mentor_email"]
        del cleaned_data["mentor_profile_id"]
        del cleaned_data["students"]
        spacetime_field_names = ("location", "start_time", "duration", "day_of_week")
        for field in spacetime_field_names:
            # Bail out and let form handle missing field validation
            if field not in cleaned_data:
                return cleaned_data
        location = cleaned_data["location"]
        start_time = cleaned_data["start_time"]
        duration = cleaned_data["duration"]
        day_of_week = cleaned_data["day_of_week"]
        for field in spacetime_field_names:
            del cleaned_data[field]
        cleaned_data["spacetime"] = Spacetime.objects.create(
            _location=location,
            _start_time=start_time,
            _duration=duration,
            _day_of_week=day_of_week
        )
        self.instance.spacetime = cleaned_data["spacetime"]
        return cleaned_data

    class Meta:
        model = Section
        fields = (
            "course",
            "mentor",
            "description",
            "spacetime",
            "capacity"
        )


@admin.register(Section)
class SectionAdmin(CoordAdmin):
    actions = ("swap_mentors",)
    form = SectionForm
    fieldsets = (
        (
            "Mentor Information",
            {"fields": ("mentor_name", "mentor_email", "mentor_profile_id")},
        ),
        (
            "Section Information",
            {
                "fields": (
                    "course",
                    "mentor",
                    "description",
                    "capacity",
                    "location",
                    "start_time",
                    "duration",
                    "day_of_week",
                    "students"
                )
            },
        ),
    )
    list_filter = ("course", "spacetime___day_of_week")
    list_display = (
        "mentor",
        "course",
        "description",
        "spacetime",
        "current_student_count",
        "capacity",
    )
    search_fields = (
        "course__name",
        "mentor__user__first_name",
        "mentor__user__last_name",
        "spacetime___day_of_week",
        "spacetime___location",
    )

    def get_form(self, request, obj=None, **kwargs):
        # Needed to pass user to SectionForm
        # https://stackoverflow.com/a/54151253
        form_class = super().get_form(request, obj, **kwargs)

        class SectionFormWrapper(form_class):
            def __new__(cls, *args, **kwargs):
                kwargs["user"] = request.user
                return form_class(*args, **kwargs)
        return SectionFormWrapper

    def swap_mentors(self, request, queryset):
        if queryset.count() != 2:
            self.message_user(request, 'Please select exactly 2 sections to swap the mentors of', level=messages.ERROR)
            return
        section_1, section_2 = queryset
        if section_1.course != section_2.course:
            self.message_user(request, 'You cannot swap mentors from different courses', level=messages.ERROR)
            return
        with transaction.atomic():
            mentor_1, mentor_2 = section_1.mentor, section_2.mentor
            queryset.update(mentor=None)  # set both section_1 and section_2 mentor to None and save
            section_1.mentor = mentor_2
            section_1.save()
            section_2.mentor = mentor_1
            section_2.save()
        self.message_user(request, f'Swapped mentors {mentor_1.name} and {mentor_2.name}')


@admin.register(Spacetime)
class SpacetimeAdmin(CoordAdmin):
    fields = ("_location", "_day_of_week", "_start_time", "_duration")
    list_display = ("_location", "_day_of_week", "_start_time")
    list_filter = ("_location", "_day_of_week")
    search_fields = ("_location", "_day_of_week")

    def has_module_permission(self, request, obj=None):
        return request.user.is_superuser  # should only be editable through section

    def has_delete_permission(self, request, obj=None):
        return False  # will break 1to1 invariants if deleted


@admin.register(Course)
class CourseAdmin(CoordAdmin):
    fields = (
        "name",
        "valid_until",
        "enrollment_start",
        "enrollment_end",
        "permitted_absences",
        "number_of_sections",
        "number_of_students",
        "number_of_mentors",
    )
    readonly_fields = (
        "number_of_sections",
        "number_of_students",
        "number_of_mentors",
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("section_set")

    def number_of_sections(self, obj):
        return obj.section_set.count()

    def number_of_students(self, obj):
        return Student.objects.filter(active=True, section__course=obj).count()

    def number_of_mentors(self, obj):
        return (
            # Filter by unique emails
            # (Don't need to do this for students since you can only be in one section per course)
            Mentor.objects.filter(section__course=obj)
            .values("user__email")
            .annotate(ct=Count("user__email"))
            .count()
        )


class DayStartFilter(admin.SimpleListFilter):
    template = "admin/input_filter.html"
    parameter_name = "start_date"
    title = "start date"

    def lookups(self, request, model_admin):
        # Dummy, required to show the filter.
        return ((),)

    def choices(self, changelist):
        # Grab only the "all" option.
        all_choice = next(super().choices(changelist))
        all_choice["query_parts"] = (
            (k, v)
            for k, v in changelist.get_filters_params().items()
            if k != self.parameter_name
        )
        yield all_choice

    def queryset(self, request, queryset):
        try:
            if self.value() is not None:
                filter_day_start = self.value()
                return queryset.filter(Q(date__gte=filter_day_start))
            else:
                return queryset.all()
        except ValidationError:
            return queryset.all()


class DayEndFilter(admin.SimpleListFilter):
    template = "admin/input_filter.html"
    parameter_name = "end_date"
    title = "end date"

    def lookups(self, request, model_admin):
        # Dummy, required to show the filter.
        return ((),)

    def choices(self, changelist):
        # Grab only the "all" option.
        all_choice = next(super().choices(changelist))
        all_choice["query_parts"] = (
            (k, v)
            for k, v in changelist.get_filters_params().items()
            if k != self.parameter_name
        )
        yield all_choice

    def queryset(self, request, queryset):
        try:
            if self.value() is not None:
                filter_day_end = self.value()
                return queryset.filter(Q(date__lte=filter_day_end))
            else:
                return queryset.all()
        except ValidationError:
            return queryset.all()


@admin.register(Attendance)
class AttendanceAdmin(CoordAdmin):
    DAY_DICT = Spacetime.DAY_OF_WEEK_CHOICES

    fields = (
        "date",
        "student",
        "get_student_display",
        "student_email",
        "section_time",
        "section_location",
        "get_mentor_display",
        "mentor_email",
        "presence",
    )

    readonly_fields = (
        "section_time",
        "section_location",
        "get_mentor_display",
        "mentor_email",
        "get_student_display",
        "student_email",
    )

    list_display = (
        "date",
        "get_student_display",
        "student_email",
        "section_time",
        "section_location",
        "get_mentor_display",
        "mentor_email",
        "presence",
    )

    list_filter = ("presence", "student__section__course", DayStartFilter, DayEndFilter)
    search_fields = ("student__user__first_name", "student__user__last_name")
    ordering = ("-date",)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "student":
            kwargs["queryset"] = Student.objects.filter(student__section__course__in=get_visible_courses(request.user))
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_queryset(self, request):
        queryset = super().get_queryset(request).select_related(
            "student__section",
            "student__section__spacetime",
            "student__section__mentor__user",
            "student__user"
        )
        if request.user.is_superuser:
            return queryset
        return queryset.filter(student__section__course__in=get_visible_courses(request.user))

    def section_time(self, obj):
        return obj.student.section.spacetime.start_time

    def section_location(self, obj):
        return obj.student.section.spacetime.location

    def get_mentor_display(self, obj):
        return get_admin_link_for(obj.student.section.mentor, "admin:scheduler_mentor_change")

    get_mentor_display.short_description = "Mentor"

    def mentor_email(self, obj):
        return obj.student.section.mentor.user.email

    def get_student_display(self, obj):
        return get_admin_link_for(obj.student, "admin:scheduler_student_change")

    get_student_display.short_description = "Student"

    def student_email(self, obj):
        return obj.student.user.email

    def presence(self, obj):
        return obj.presence


@admin.register(Override)
class OverrideAdmin(admin.ModelAdmin):
    # TODO make all this info more useful
    fields = ("date", "spacetime", "overriden_spacetime")
    ordering = ("-date",)

    list_filter = ("spacetime___day_of_week", "spacetime__section__course")

    def has_module_permission(self, request, obj=None):
        return request.user.is_superuser  # TODO remove when implemented as coord view
