from django.db import models
from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.core.exceptions import ValidationError
from django.utils.html import format_html
from django.urls import reverse
from scheduler.models import (
    User,
    Attendance,
    Course,
    Profile,
    Section,
    Spacetime,
    Override,
)


class CoordAdmin(admin.ModelAdmin):
    def has_view_permission(self, request, obj=None):
        return request.user.is_staff or request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_staff or request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff or request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_staff or request.user.is_superuser

    def has_module_permission(self, request):
        return request.user.is_staff or request.user.is_superuser


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


@admin.register(Section)
class SectionAdmin(CoordAdmin):
    fieldsets = (
        (
            "Mentor Information",
            {"fields": ("get_mentor_display", "get_mentor_email", "get_profile_id")},
        ),
        (
            "Section Information",
            {
                "fields": (
                    "course",
                    "get_default_spacetime",
                    "capacity",
                    "current_student_count",
                    "students",
                )
            },
        ),
    )
    readonly_fields = (
        "get_mentor_display",
        "get_mentor_email",
        "get_default_spacetime",
        "get_profile_id",
        "course",
        "current_student_count",
        "students",
    )
    list_filter = ("course", "default_spacetime__day_of_week")
    list_display = (
        "course",
        "default_spacetime",
        "get_mentor_display",
        "get_mentor_email",
        "current_student_count",
        "capacity",
    )
    search_fields = (
        "course__name",
        "profile__user__first_name",  # FK'd on mentor hopefully
        "profile__user__last_name",
        "default_spacetime__day_of_week",
        "default_spacetime__location",
    )

    def has_add_permission(self, request):
        return request.user.is_superuser  # add sections by creating profiles :L

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(
            course__in=[
                p.course
                for p in request.user.profile_set.filter(
                    active=True, role=Profile.COORDINATOR
                )
            ]
        )

    def get_default_spacetime(self, obj):
        admin_url = reverse(
            "admin:scheduler_spacetime_change", args=(obj.default_spacetime.id,)
        )
        return format_html(
            '<div class="related-widget-wrapper"> \
            <a class="related-widget-wrapper-link change-related"change-related" \
            id="change_id_default_spacetime" \
            href="{}?_to_field=id&_popup=1">{}</a></div>',
            admin_url,
            str(obj.default_spacetime),
        )

    get_default_spacetime.short_description = "Default room/time"

    def get_mentor_email(self, obj):
        return obj.mentor.user.email

    get_mentor_email.short_description = "mentor email"

    def get_profile_id(self, obj):
        return obj.mentor.id

    get_profile_id.short_description = "Profile ID"

    def get_mentor_display(self, obj):
        admin_url = reverse("admin:scheduler_profile_change", args=(obj.mentor.id,))
        return format_html('<a href="{}">{}</a>', admin_url, obj.mentor.name)

    get_mentor_display.short_description = "mentor"

    def students(self, obj):
        student_links = []
        for student in obj.students.filter(active=True):
            admin_url = reverse("admin:scheduler_profile_change", args=(student.id,))
            student_links.append(
                format_html(
                    '<a style="display: block" href="{}">{} {}</a>',
                    admin_url,
                    student.name,
                    student.user.email,
                )
            )
        return format_html("".join(student_links))


@admin.register(Profile)
class ProfileAdmin(CoordAdmin):
    readonly_fields = ("name", "get_attendances")
    list_filter = ("course", "role", "active")
    search_fields = ("user__email", "user__first_name", "user__last_name")
    actions = ("deactivate_profiles", "activate_profiles")
    autocomplete_fields = ("leader", "section", "user")

    def has_delete_permission(self, request, obj=None):
        return (
            False
        )  # delete sections + mentor by deleting sections, drop by deactivating

    def get_changeform_initial_data(self, request):
        vals = super().get_changeform_initial_data(request)
        profiles = request.user.profile_set.filter(
            active=True, role=Profile.COORDINATOR
        )
        count = profiles.count()
        if count == 1:
            if "course" not in vals:
                vals["course"] = ps.first().course
        return vals

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser:
            courses = [
                p.course
                for p in request.user.profile_set.filter(
                    active=True, role=Profile.COORDINATOR
                )
            ]
            if db_field.name == "leader":
                kwargs["queryset"] = Profile.objects.filter(course__in=courses)
            elif db_field.name == "section":
                kwargs["queryset"] = Section.objects.filter(course__in=courses)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_fields(self, request, obj=None):
        fields = ["name", "course", "role", "section", "user"]
        if request.user.is_superuser:
            fields.insert(2, "leader")
        if obj and obj.role == "ST":
            fields.append("get_attendances")
            fields.append("active")
        return tuple(fields)

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(
            role=Profile.STUDENT,  # TODO for now, only allows student creation
            course__in=[
                p.course
                for p in request.user.profile_set.filter(
                    active=True, role=Profile.COORDINATOR
                )
            ],
        )

    def save_model(self, request, obj, form, change):
        if obj.role == Profile.STUDENT:
            obj.leader = obj.section.leader
        super().save_model(request, obj, form, change)

    def deactivate_profiles(self, request, queryset):
        queryset.update(active=False)

    deactivate_profiles.short_description = "Mark selected profiles as inactive"

    def activate_profiles(self, request, queryset):
        queryset.update(active=True)

    activate_profiles.short_description = "Mark selected profiles as active"

    def get_attendances(self, obj):
        attendance_links = []
        for attendance in obj.attendance_set.all():
            admin_url = reverse("admin:scheduler_attendance_change", args=(attendance.id,))
            attendance_links.append(
                format_html(
                    '<a style="display: block" href="{}">Week of {}: {}</a>',
                    admin_url,
                    attendance.week_start,
                    attendance.presence if attendance.presence else "--"
                )
            )
        attendance_links.sort()
        return format_html("".join(attendance_links))

    get_attendances.short_description = "Attendances"


@admin.register(Spacetime)
class SpacetimeAdmin(CoordAdmin):
    fields = ("location", "day_of_week", "start_time", "duration")
    list_display = ("location", "day_of_week", "start_time")
    list_filter = ("location", "day_of_week")
    search_fields = ("location", "day_of_week")

    def has_module_permission(self, request, obj=None):
        return request.user.is_superuser  # should only be editable through section

    def has_delete_permission(self, request, obj=None):
        return False  # will break 1to1 invariants if deleted

    def get_queryset(self, request):
        return Spacetime.objects.all()


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    fields = (
        "name",
        "valid_until",
        "enrollment_start",
        "enrollment_end",
        "number_of_sections",
        "number_of_students",
        "number_of_junior_mentors",
        "number_of_senior_mentors",
    )
    readonly_fields = (
        "number_of_sections",
        "number_of_students",
        "number_of_junior_mentors",
        "number_of_senior_mentors",
    )

    def has_view_permission(self, request, obj=None):
        return request.user.is_staff or request.user.is_superuser

    def number_of_sections(self, obj):
        return obj.section_set.count()

    def number_of_students(self, obj):
        return obj.profile_set.filter(role=Profile.STUDENT, active=True).count()

    def number_of_junior_mentors(self, obj):
        return obj.profile_set.filter(role=Profile.JUNIOR_MENTOR, active=True).count()

    def number_of_senior_mentors(self, obj):
        return obj.profile_set.filter(role=Profile.SENIOR_MENTOR, active=True).count()


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    fields = ("presence", "week_start", "section", "attendee")
    list_display = ("attendee", "week_start", "presence", "section")
    list_filter = ("presence", "attendee__course")
    search_fields = ("attendee__user__first_name", "attendee__user__last_name")
    ordering = ("-week_start",)

    def has_module_permission(self, request, obj=None):
        return request.user.is_superuser  # TODO remove when implemented as coord view


@admin.register(Override)
class OverrideAdmin(admin.ModelAdmin):
    fields = ("week_start", "spacetime", "section")
    ordering = ("-week_start",)

    list_filter = ("spacetime__day_of_week", "section__course")

    def has_module_permission(self, request, obj=None):
        return request.user.is_superuser  # TODO remove when implemented as coord view
