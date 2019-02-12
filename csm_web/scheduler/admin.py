from django.contrib import admin
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


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    fields = ("username", "email", "first_name", "last_name", "is_active")
    search_fields = ("email",)
    list_display = ("name", "email")
    list_filter = ("is_active",)

    def name(self, obj):
        return f"{obj.first_name} {obj.last_name}"


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
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

    def get_mentor_display(self, obj):
        admin_url = reverse('admin:scheduler_profile_change', args=(obj.mentor.id,))
        return format_html('<a href="{}">{}</a>', admin_url, obj.mentor.name)

    get_mentor_display.short_description = "mentor"

    def students(self, obj):
        student_links = []
        for student in obj.students.filter(active=True):
            admin_url = reverse('admin:scheduler_profile_change', args=(student.id,))
            student_links.append(format_html('<a style="display: block" href="{}">{} {}</a>', admin_url, student.name, student.user.email))
        return format_html(''.join(student_links))

@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    fields = ("name", "leader", "course", "role", "section", "user", "active")
    readonly_fields = ("name",)
    list_filter = ("course", "role", "active")
    search_fields = ("user__email",)
    actions = ("deactivate_profiles", "activate_profiles")

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
class AttendanceAdmin(admin.ModelAdmin):
    fields = ("get_presence_display", "week_start", "section", "attendee")
    list_display = ("attendee", "week_start", "presence")
    list_filter = ("presence", "attendee__course")
    search_fields = ("attendee__name",)
    readonly_fields = ("get_presence_display",)
    ordering = ("-week_start",)


@admin.register(Override)
class OverrideAdmin(admin.ModelAdmin):
    fields = ("week_start", "spacetime", "section")
    ordering = ("-week_start",)

    list_filter = ("spacetime__day_of_week", "section__course")
