from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
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
        return request.user.is_staff

    def has_add_permission(self, request):
        return request.user.is_staff

    def has_change_permission(self, request, obj=None):
        return request.user.is_staff

    def has_delete_permission(self, request, obj=None):
        return request.user.is_staff

    def has_module_permission(self, request):
        return request.user.is_staff

# @admin.register(User)
class CoordEditStudent(admin.CoordAdmin):
    """
    Allows coordinators to enroll/edit students.
    """
    ...


# @admin.register(Profile)
class CoordEditSection(admin.CoordAdmin):
    """
    Allows coordinators to add/edit sections, i.e. mentor profile + section + spacetime.
    """

    fields = ("username", "email", "first_name", "last_name", "is_active", "course")
    readonly_fields = ("username", "email", "first_name", "last_name", "is_active")
    fieldsets = (
        ("Mentor Information", {"fields": ()}),
        ("Section Information", {"fields": ()}),
    )

    def save_model(self, request, obj, form, change):
        ...


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    fields = ("username", "email", "first_name", "last_name", "is_active")
    search_fields = ("email",)
    list_display = ("name", "email")
    list_filter = ("is_active",)

    def name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


@admin.register(Section)
class SectionAdmin(admin.CoordAdmin):
    fields = (
        "course",
        "default_spacetime",
        "get_mentor_display",
        "capacity",
        "current_student_count",
        "students",
    )
    readonly_fields = ("get_mentor_display", "current_student_count", "students")
    list_filter = ("course", "default_spacetime__day_of_week")
    list_display = (
        "course",
        "default_spacetime",
        "get_mentor_display",
        "capacity",
        "current_student_count",
    )
    search_fields = (
        "course__name",
        "default_spacetime__day_of_week",
        "default_spacetime__location",
    )

    def has_add_permission(self, request):
        return False # add sections by creating profiles :L
    
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
class ProfileAdmin(admin.CoordAdmin):
    fields = ("name", "leader", "course", "role", "section", "user", "active")
    readonly_fields = ("name",)
    list_filter = ("course", "role", "active")
    search_fields = ("user__email",)
    actions = ("deactivate_profiles", "activate_profiles")
    autocomplete_fields = ("leader", "section", "user")

    def deactivate_profiles(self, request, queryset):
        queryset.update(active=False)

    deactivate_profiles.short_description = "Mark selected profiles as inactive"

    def activate_profiles(self, request, queryset):
        queryset.update(active=True)

    activate_profiles.short_description = "Mark selected profiles as active"


@admin.register(Spacetime)
class SpacetimeAdmin(admin.ModelAdmin):
    fields = ("location", "day_of_week", "start_time", "duration")
    list_display = ("location", "day_of_week", "start_time")
    list_filter = ("day_of_week",)
    search_fields = ("location",)


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

    def number_of_sections(self, obj):
        return obj.section_set.count()

    def number_of_students(self, obj):
        return obj.profile_set.filter(role=Profile.STUDENT, active=True).count()

    def number_of_junior_mentors(self, obj):
        return obj.profile_set.filter(role=Profile.JUNIOR_MENTOR, active=True).count()

    def number_of_senior_mentors(self, obj):
        return obj.profile_set.filter(role=Profile.SENIOR_MENTOR, active=True).count()


@admin.register(Attendance)
class AttendanceAdmin(admin.CoordAdmino):
    fields = ("get_presence_display", "week_start", "section", "attendee")
    list_display = ("attendee", "week_start", "presence")
    list_filter = ("presence", "attendee__course")
    search_fields = ("attendee__name",)
    readonly_fields = ("get_presence_display",)
    ordering = ("-week_start",)


@admin.register(Override)
class OverrideAdmin(admin.CoordAdmin):
    fields = ("week_start", "spacetime", "section")
    ordering = ("-week_start",)

    list_filter = ("spacetime__day_of_week", "section__course")
