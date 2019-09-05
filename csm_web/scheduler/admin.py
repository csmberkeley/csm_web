from django.db.models import Count, Q
from django.contrib import admin
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from django.urls import reverse

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


def get_admin_link_for(obj_property, reverse_path):
    """
    Returns embeddable HTML for an admin URL to the specified property.
    obj_property should be the object that was looked up, e.g. "obj.user" should be passed
    rather than "user".
    Uses the provided str of obj_property.
    """
    admin_url = reverse(
        reverse_path, args=(obj_property.id,)
    )
    return format_html(
        '<a style="display: block" href="{}">{}</a>',
        admin_url,
        obj_property
    )


def get_obj_or_none(model, **kwargs):
    """Wraps model queries in what amounts to an Optional."""
    try:
        return model.objects.get(**kwargs)
    except model.DoesNotExist:
        return None


def get_visible_courses(user):
    """
    Returns a list of Course objects that the request's user can see.
    """
    if user.is_superuser:
        return Course.objects.all()
    else:
        return Coordinator.objects.filter(user=user).values_list("course")


def is_user_admin(user):
    return user.is_superuser or user.is_staff or get_obj_or_none(Coordinator, user=user) is not None


class CoordAdmin(admin.ModelAdmin):
    def has_view_permission(self, request, obj=None):
        return is_user_admin(request.user)

    def has_add_permission(self, request):
        return is_user_admin(request.user)

    def has_change_permission(self, request, obj=None):
        return is_user_admin(request.user)

    def has_delete_permission(self, request, obj=None):
        return is_user_admin(request.user)

    def has_module_permission(self, request):
        return is_user_admin(request.user)

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
    list_filter = ("active",)
    list_display = ("name", "get_email", "get_course", "get_mentor", "section")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    actions = ("drop_students", "undrop_students")
    # autocomplete_fields = ("section", "user")

    def get_fields(self, request, obj):
        fields = ["name", "get_email", "get_course", "section", "get_attendances"]
        fields.insert(4, "user" if request.user.is_superuser else "get_user")
        return tuple(fields)

    def get_readonly_fields(self, request, obj):
        fields = ["get_course", "get_email", "name", "get_attendances"]
        if not request.user.is_superuser:
            fields.insert(0, "get_user")
        return tuple(fields)

    def has_delete_permission(self, request, obj=None):
        return (
            False
        )  # delete sections + mentor by deleting sections, drop by deactivating

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser:
            courses = get_visible_courses(request.user)
            if db_field.name == "section":
                kwargs["queryset"] = Section.objects.filter(course__in=courses)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(section__course__in=get_visible_courses(request.user))

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
        return get_admin_link_for(obj.section.mentor, "admin:scheduler_mentor_change")

    def get_attendances(self, obj):
        attendance_links = []
        for attendance in obj.attendance_set.all():
            admin_url = reverse(
                "admin:scheduler_attendance_change", args=(attendance.id,)
            )
            attendance_links.append(
                format_html(
                    '<a style="display: block" href="{}">Date {}: {}</a>',
                    admin_url,
                    attendance.date,
                    attendance.presence if attendance.presence else "--",
                )
            )
        attendance_links.sort()
        return format_html("".join(attendance_links))

    get_attendances.short_description = "Attendances"


@admin.register(Mentor)
class MentorAdmin(CoordAdmin):
    # list_filter = ("get_course", "active")
    list_display = ("name", "get_email", "get_course", "get_section")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    actions = ("deactivate_profiles", "activate_profiles")
    # autocomplete_fields = ("section", "user")

    def has_delete_permission(self, request, obj=None):
        return (
            False
        )  # delete sections + mentor by deleting sections, drop by deactivating

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(section__course__in=get_visible_courses(request.user))

    def get_fields(self, request, obj):
        fields = ["name", "get_email", "get_course", "get_section", "get_students"]
        fields.insert(4, "user" if request.user.is_superuser else "get_user")
        return tuple(fields)

    def get_readonly_fields(self, request, obj):
        fields = ["get_course", "get_email", "get_section", "name", "get_students"]
        if request.user.is_superuser:
            fields.insert(0, "get_user")
        return tuple(fields)

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
        course = obj.section.course
        admin_url = reverse(
            "admin:scheduler_course_change", args=(course.id,)
        )
        return format_html(
            '<a style="display: block" href="{}">{}</a>',
            admin_url,
            course
        )

    get_course.short_description = "Course"

    def get_students(self, obj):
        student_links = []
        for student in obj.section.student_set.all():
            student_links.append(get_admin_link_for(student, "admin:scheduler_student_change"))
        student_links.sort()
        return format_html("".join(student_links))

    get_students.short_description = "Students"


@admin.register(Section)
class SectionAdmin(CoordAdmin):
    fieldsets = (
        (
            "Mentor Information",
            {"fields": ("get_mentor_name", "get_mentor_email", "get_mentor_id")},
        ),
        (
            "Section Information",
            {
                "fields": (
                    "course",
                    "mentor",
                    "description",
                    "get_spacetime",
                    "capacity",
                    "current_student_count",
                    "get_students",
                )
            },
        ),
    )
    readonly_fields = (
        "get_mentor_name",
        "get_mentor_email",
        "get_mentor_id",
        "get_spacetime",
        "course",
        "current_student_count",
        "get_students",
    )
    list_filter = ("course", "spacetime___day_of_week")  # Note the 3x underscore!
    list_display = (
        "mentor",
        "course",
        "description",
        "get_spacetime",
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

    # def get_queryset(self, request):
    #     qs = super().get_queryset(request)
    #     if request.user.is_superuser:
    #         return qs
    #     return qs.filter(
    #         course__in=[
    #             p.course
    #             for p in request.user.profile_set.filter(
    #                 active=True, role=Profile.COORDINATOR
    #             )
    #         ]
    #     )

    # Custom fields

    # TODO add signifier that clicking this link allow sinline editing
    def get_spacetime(self, obj):
        admin_url = reverse(
            "admin:scheduler_spacetime_change", args=(obj.spacetime.id,)
        )
        return format_html(
            '<div class="related-widget-wrapper"> \
            <a class="related-widget-wrapper-link change-related"change-related" \
            id="change_id_spacetime" \
            href="{}?_to_field=id&_popup=1">{}</a></div>',
            admin_url,
            str(obj.spacetime),
        )

    get_spacetime.short_description = "Room/time"

    def get_mentor_email(self, obj):
        return obj.mentor.user.email

    get_mentor_email.short_description = "Email"

    def get_mentor_id(self, obj):
        return obj.mentor.id

    get_mentor_id.short_description = "Profile ID"

    def get_mentor_name(self, obj):
        return obj.mentor.name

    get_mentor_name.short_description = "Name"

    def get_students(self, obj):
        student_links = []
        for student in obj.students.filter(active=True):
            student_links.append(get_admin_link_for(student, "admin:scheduler_student_change"))
        student_links.sort()
        return format_html("".join(student_links))


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
    title = "Start date"

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
    title = "End date"

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
    fields = ("week_start", "spacetime", "section")
    ordering = ("-week_start",)

    list_filter = ("spacetime__day_of_week", "section__course")

    def has_module_permission(self, request, obj=None):
        return request.user.is_superuser  # TODO remove when implemented as coord view
