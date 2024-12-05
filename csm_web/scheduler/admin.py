from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.urls import reverse
from django.utils.html import format_html, format_html_join
from scheduler.models import (
    Attendance,
    Coordinator,
    Course,
    Mentor,
    Override,
    Section,
    SectionOccurrence,
    Spacetime,
    Student,
    User,
)

# Helper methods


def get_admin_link_for(obj_property, reverse_path, display_text=None):
    """
    Returns embeddable HTML for an admin URL to the specified property.
    obj_property should be the object that was looked up, e.g. "obj.user" should be passed
    rather than "user".
    If display_text is provided, then uses the provided str of obj_property as the URL text.
    """
    admin_url = reverse(reverse_path, args=(obj_property.id,))
    return format_html(
        '<a style="display: block" href="{}">{}</a>',
        admin_url,
        display_text or obj_property,
    )


def get_visible_courses(user):
    """
    Returns a list of Course objects that the request's user can see.
    """
    if user.is_superuser:
        return Course.objects.all()
    return Coordinator.objects.filter(user=user).values_list("course")


def is_user_admin(user):
    """Determine whether the user is an admin"""
    return user.is_superuser or user.is_staff


def format_spacetimes(spacetimes):
    """
    Format spacetimes from a queryset, for use in admin list pages.
    Spacetime strings are escaped by Django HTML utilities before formatting.
    """
    return format_html_join(
        "", "{}<br>", [[str(spacetime)] for spacetime in spacetimes]
    )


# Custom filters


class DayStartFilter(admin.SimpleListFilter):
    template = "admin/input_filter.html"
    parameter_name = "start_date"
    title = "start date"
    filter_field = "date"

    def lookups(self, request, model_admin):
        # Dummy, required to show the filter.
        return ((),)

    def choices(self, changelist):
        try:
            # Grab only the "all" option.
            all_choice = next(super().choices(changelist))
        except StopIteration:
            return

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
                # build query based on filter field value
                return queryset.filter(
                    Q(**{f"{self.filter_field}__gte": filter_day_start})
                )
            return queryset.all()
        except ValidationError:
            return queryset.all()


class DayEndFilter(admin.SimpleListFilter):
    template = "admin/input_filter.html"
    parameter_name = "end_date"
    title = "end date"
    filter_field = "date"

    def lookups(self, request, model_admin):
        # Dummy, required to show the filter.
        return ((),)

    def choices(self, changelist):
        try:
            # Grab only the "all" option.
            all_choice = next(super().choices(changelist))
        except StopIteration:
            return

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
                # build query based on filter field value
                return queryset.filter(
                    Q(**{f"{self.filter_field}__lte": filter_day_end})
                )
            return queryset.all()
        except ValidationError:
            return queryset.all()


def day_filters_on_field(filter_field: str):
    """Create filters on a custom date field name."""
    custom_start_filter = DayStartFilter
    custom_end_filter = DayEndFilter
    custom_start_filter.filter_field = filter_field
    custom_end_filter.filter_field = filter_field
    return (custom_start_filter, custom_end_filter)


# Inline models


class CourseInline(admin.TabularInline):
    model = Course.whitelist.through
    extra = 0
    verbose_name = "whitelist"
    verbose_name_plural = "whitelists"

    def formfield_for_foreignkey(self, db_field, request=None, **kwargs):
        if db_field.name == "course":
            # only give restricted courses
            kwargs["queryset"] = Course.objects.filter(is_restricted=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class SpacetimeInline(admin.TabularInline):
    model = Spacetime
    extra = 0
    show_change_link = True


class StudentInline(admin.TabularInline):
    model = Student
    extra = 0
    show_change_link = True


class AttendanceInline(admin.TabularInline):
    model = Attendance
    extra = 0
    readonly_fields = ("sectionOccurrence",)
    show_change_link = True


# Admin views


class BasePermissionModelAdmin(admin.ModelAdmin):
    # pylint: disable=unused-argument
    def has_permission(self, request, obj=None):
        """Whether the user has permission to access this model."""
        return is_user_admin(request.user)

    has_view_permission = has_permission
    has_add_permission = has_permission
    has_change_permission = has_permission
    has_delete_permission = has_permission
    has_module_permission = has_permission


@admin.register(User)
class UserAdmin(BasePermissionModelAdmin):
    fields = (
        "username",
        "email",
        "first_name",
        "last_name",
        "priority_enrollment",
        "bio",
        "profile_image",
    )

    list_display = (
        "id",
        "name",
        "email",
        "priority_enrollment",
        "bio",
        "profile_image",
    )
    list_display_links = ("name",)
    list_filter = ("is_active",)
    search_fields = (
        "id",
        "first_name",
        "last_name",
        "email",
    )

    inlines = (CourseInline,)

    def name(self, obj: User):
        """
        Retrieve the full name for the user.
        Falls back to the username if the full name does not exist.
        """
        full_name = obj.get_full_name()
        if full_name:
            return full_name
        # fallback to username
        return obj.username

    # pylint: disable=unused-argument
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Student)
class StudentAdmin(BasePermissionModelAdmin):
    fieldsets = (
        (
            None,
            {
                "fields": (
                    "name",
                    "get_email",
                    "get_course",
                    "section",
                    "active",
                    "banned",
                )
            },
        ),
        (
            "Attendance statistics",
            {
                "fields": (
                    "get_present_count",
                    "get_excused_absence_count",
                    "get_unexcused_absence_count",
                )
            },
        ),
    )
    readonly_fields = (
        "get_course",
        "get_email",
        "name",
        "get_present_count",
        "get_excused_absence_count",
        "get_unexcused_absence_count",
    )
    autocomplete_fields = (
        "user",
        "section",
    )

    actions = (
        "drop_students",
        "undrop_students",
    )
    list_display = (
        "id",
        "get_user",
        "get_email",
        "get_course",
        "get_mentor",
        "get_section",
        "get_section_spacetimes",
    )
    list_filter = (
        "active",
        "banned",
        "section__mentor__course",
    )
    search_fields = (
        "id",
        "user__email",
        "user__first_name",
        "user__last_name",
    )

    inlines = (AttendanceInline,)

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if not request.user.is_superuser and db_field.name == "section":
            kwargs["queryset"] = Section.objects.filter(
                course__in=get_visible_courses(request.user)
            )
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    def get_queryset(self, request):
        queryset = (
            super()
            .get_queryset(request)
            .select_related("user", "course", "section__mentor")
        )
        if request.user.is_superuser:
            return queryset
        return queryset.filter(course__in=get_visible_courses(request.user))

    @admin.action(
        description=(
            "Drop student(s) from a section. This action is reversible, but it is still"
            " strongly recommended that you double check the name/email/section/course"
            " first."
        )
    )
    def drop_students(self, request, queryset):
        """Drop students from a section."""
        queryset.update(active=False)

    @admin.action(
        description=(
            "Re-enroll student(s) in the section they were previously dropped from."
        )
    )
    def undrop_students(self, request, queryset):
        """Undrop students from a section."""
        queryset.update(active=True)

    # Custom fields

    @admin.display(description="Email")
    def get_email(self, obj: Student):
        """Retrieve the student's email."""
        return obj.user.email

    @admin.display(description="User")
    def get_user(self, obj: Student):
        """Retrieve the admin url for editing the student user."""
        return get_admin_link_for(
            obj.user, "admin:scheduler_user_change", display_text=obj.name
        )

    @admin.display(description="Course")
    def get_course(self, obj: Student):
        """Retrieve the course associated with the student."""
        return get_admin_link_for(obj.course, "admin:scheduler_course_change")

    @admin.display(description="Mentor")
    def get_mentor(self, obj: Student):
        """Retrieve the mentor associated with the student's section."""
        if obj.section is not None and obj.section.mentor is not None:
            return get_admin_link_for(
                obj.section.mentor, "admin:scheduler_mentor_change"
            )
        return None

    @admin.display(description="Section")
    def get_section(self, obj: Student):
        """Retrieve the section associated with this student."""
        return get_admin_link_for(
            obj.section,
            "admin:scheduler_section_change",
            display_text=f"{obj.course.name} section (id {obj.section.id})",
        )

    @admin.display(description="Section spacetimes")
    def get_section_spacetimes(self, obj: Student):
        """Retrieve and format the spacetimes for the section the student is enrolled in."""
        return format_spacetimes(obj.section.spacetimes.all())

    @admin.display(description="Attendances")
    def get_attendances(self, obj: Student):
        """Retrieve all student attendances."""
        attendance_links = sorted(
            get_admin_link_for(
                attendance,
                "admin:scheduler_attendance_change",
                f"Date {attendance.date}: {attendance.presence or '--'}",
            )
            for attendance in obj.attendance_set.all()
        )
        return format_html("".join(attendance_links))

    @admin.display(description="Present count")
    def get_present_count(self, obj: Student):
        """Retrieve the number of present attendances for this student."""
        return obj.attendance_set.filter(presence="PR").count()

    @admin.display(description="Excused count")
    def get_excused_absence_count(self, obj: Student):
        """Retrieve the number of excused absences for this student."""
        return obj.attendance_set.filter(presence="EX").count()

    @admin.display(description="Unexcused count")
    def get_unexcused_absence_count(self, obj: Student):
        """Retrieve the number of unexcused absences for this student."""
        return obj.attendance_set.filter(presence="UN").count()


@admin.register(Mentor)
class MentorAdmin(BasePermissionModelAdmin):
    fields = (
        "name",
        "get_email",
        "course",
        "user",
        "get_section",
        "get_students",
    )
    readonly_fields = (
        "name",
        "get_email",
        "get_section",
        "get_students",
    )
    autocomplete_fields = (
        "user",
        "course",
    )

    list_filter = (("course", admin.RelatedOnlyFieldListFilter),)
    list_display = (
        "id",
        "get_user",
        "get_email",
        "get_course",
        "get_section",
        "get_spacetimes",
    )
    search_fields = (
        "user__email",
        "user__first_name",
        "user__last_name",
        "course__name",
    )

    actions = (
        "deactivate_profiles",
        "activate_profiles",
    )

    def get_queryset(self, request):
        queryset = (
            super()
            .get_queryset(request)
            .select_related("user", "course")
            .prefetch_related("section__students")
        )
        if request.user.is_superuser:
            return queryset
        return queryset.filter(course__in=get_visible_courses(request.user))

    @admin.display(description="Email")
    def get_email(self, obj):
        """Retrieve the mentor's email."""
        return obj.user.email

    @admin.display(description="User")
    def get_user(self, obj):
        """Format link to the associated user object."""
        return get_admin_link_for(
            obj.user, "admin:scheduler_user_change", display_text=obj.name
        )

    @admin.display(description="Course")
    def get_course(self, obj):
        """Format link to the associated course object."""
        return get_admin_link_for(obj.course, "admin:scheduler_course_change")

    @admin.display(description="Section")
    def get_section(self, obj):
        """
        Retrieve the admin url for editing the mentor section.
        If no associated section, returns None.
        """
        if obj.section is not None:
            return get_admin_link_for(
                obj.section,
                "admin:scheduler_section_change",
                display_text=f"{obj.course.name} section (id {obj.section.id})",
            )
        return None

    @admin.display(description="Spacetimes")
    def get_spacetimes(self, obj):
        """Format list of spacetimes associated with the mentor's section."""
        if obj.section is not None:
            return format_spacetimes(obj.section.spacetimes.all())
        return None

    @admin.display(description="Students")
    def get_students(self, obj):
        """Retrieve the list of students in the mentor's section."""
        student_links = sorted(
            get_admin_link_for(
                student,
                "admin:scheduler_student_change",
            )
            for student in obj.section.students.all()
        )
        return format_html("".join(student_links))


@admin.register(Coordinator)
class CoordinatorAdmin(BasePermissionModelAdmin):
    list_display = (
        "id",
        "name",
        "get_course",
        "get_user",
        "get_user_email",
    )
    list_display_links = ("name",)
    autocomplete_fields = (
        "user",
        "course",
    )

    @admin.display(description="User")
    def get_user(self, obj: Coordinator):
        """Format link to the associated user."""
        return get_admin_link_for(obj.user, "admin:scheduler_user_change")

    @admin.display(description="Email")
    def get_user_email(self, obj: Coordinator):
        """Retrieve the user's email."""
        return obj.user.email

    @admin.display(description="Course")
    def get_course(self, obj: Coordinator):
        """Format link to the associated course."""
        return get_admin_link_for(obj.course, "admin:scheduler_course_change")


@admin.register(Section)
class SectionAdmin(BasePermissionModelAdmin):
    autocomplete_fields = ("mentor",)

    actions = ("swap_mentors",)
    list_filter = ("mentor__course", "spacetimes__day_of_week")
    list_display = (
        "id",
        "get_mentor",
        "get_course",
        "get_spacetimes",
        "description",
        "get_capacity",
    )
    search_fields = (
        "id",
        "spacetimes__day_of_week",
        "spacetimes__location",
        "mentor__course__name",
        "mentor__user__first_name",
        "mentor__user__last_name",
        "description",
    )

    inlines = (
        SpacetimeInline,
        StudentInline,
    )

    @admin.display(description="Mentor")
    def get_mentor(self, obj: Section):
        """Format link to the associated mentor object."""
        return get_admin_link_for(obj.mentor, "admin:scheduler_mentor_change")

    @admin.display(description="Course")
    def get_course(self, obj: Section):
        """Retrieve the course corresponding to the section."""
        return get_admin_link_for(obj.mentor.course, "admin:scheduler_course_change")

    @admin.display(description="Capacity")
    def get_capacity(self, obj: Section):
        """Compute and format the number of enrolled students and total capacity."""
        return f"{obj.current_student_count}/{obj.capacity}"

    @admin.display(description="Spacetimes")
    def get_spacetimes(self, obj: Section):
        """Retrieve and format the spacetimes associated with the section."""
        return format_spacetimes(obj.spacetimes.all())

    def swap_mentors(self, request, queryset):
        """Swap the sections between two mentors."""
        if queryset.count() != 2:
            self.message_user(
                request,
                "Please select exactly 2 sections to swap the mentors of",
                level=messages.ERROR,
            )
            return
        section_1, section_2 = queryset
        if section_1.mentor.course != section_2.mentor.course:
            self.message_user(
                request,
                "You cannot swap mentors from different courses",
                level=messages.ERROR,
            )
            return
        with transaction.atomic():
            mentor_1, mentor_2 = section_1.mentor, section_2.mentor
            # set both section_1 and section_2 mentor to None and save
            queryset.update(mentor=None)

            # perform swap
            section_1.mentor = mentor_2
            section_1.save()
            section_2.mentor = mentor_1
            section_2.save()
        self.message_user(
            request, f"Swapped mentors {mentor_1.name} and {mentor_2.name}"
        )


@admin.register(Spacetime)
class SpacetimeAdmin(BasePermissionModelAdmin):
    fields = (
        "location",
        "day_of_week",
        "start_time",
        "duration",
    )
    list_display = (
        "id",
        "location",
        "day_of_week",
        "start_time",
        "duration",
        "get_section",
    )
    list_filter = ("day_of_week",)
    search_fields = (
        "location",
        "day_of_week",
    )

    @admin.display(description="Section")
    def get_section(self, obj: Spacetime):
        """Format link to the associated section object."""
        if obj.section is None:
            return None

        return get_admin_link_for(
            obj.section,
            "admin:scheduler_section_change",
            display_text=(
                f"{obj.section.mentor.course.name} section (id {obj.section.id})"
            ),
        )


@admin.register(Course)
class CourseAdmin(BasePermissionModelAdmin):
    readonly_fields = (
        "get_section_count",
        "get_student_count",
        "get_mentor_count",
    )
    filter_horizontal = ("whitelist",)

    list_display = (
        "id",
        "name",
        "title",
        "is_restricted",
        "get_section_count",
        "get_student_count",
        "get_mentor_count",
    )
    list_display_links = ("name",)
    search_fields = (
        "name",
        "title",
    )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("mentor_set")

    def get_fields(self, request, obj=None):
        all_fields = (
            "name",
            "title",
            "valid_until",
            "enrollment_start",
            "enrollment_end",
            "section_start",
            "permitted_absences",
            "is_restricted",
            "get_section_count",
            "get_student_count",
            "get_mentor_count",
        )
        if obj is not None and obj.is_restricted:
            all_fields += ("whitelist",)
        return all_fields

    @admin.display(description="Section count")
    def get_section_count(self, obj: Course):
        """Retrieve the number of sections associated with this course."""
        # only count mentors that have a section associated with it;
        # at most one section can be associated with a given mentor object
        return obj.mentor_set.filter(~Q(section=None)).count()

    @admin.display(description="Student count")
    def get_student_count(self, obj: Course):
        """Retrieve the number of students associated with this course."""
        return obj.student_set.distinct("user__email").count()

    @admin.display(description="Mentor count")
    def get_mentor_count(self, obj: Course):
        """Retrieve the number of mentors associated with this course."""
        return (
            # Filter by unique emails
            # (Don't need to do this for students since you can only be in one section per course)
            obj.mentor_set.distinct("user__email").count()
        )


@admin.register(SectionOccurrence)
class SectionOccurrenceAdmin(BasePermissionModelAdmin):
    fields = (
        "section",
        "date",
        "word_of_the_day",
    )
    autocomplete_fields = ("section",)

    list_display = (
        "id",
        "date",
        "get_section",
        "get_section_spacetimes",
        "get_section_mentor",
        "word_of_the_day",
    )
    list_filter = ("date",)
    search_fields = (
        "section__mentor__user__first_name",
        "section__mentor__user__last_name",
        "date",
        "word_of_the_day",
    )
    ordering = ("-date",)

    @admin.display(description="Section")
    def get_section(self, obj: SectionOccurrence):
        """Format link to associated section object."""
        return get_admin_link_for(
            obj.section,
            "admin:scheduler_section_change",
            display_text=(
                f"{obj.section.mentor.course.name} section (id {obj.section.id})"
            ),
        )

    @admin.display(description="Section spacetimes")
    def get_section_spacetimes(self, obj: SectionOccurrence):
        """Format spacetimes associated with the section."""
        return format_spacetimes(obj.section.spacetimes.all())

    @admin.display(description="Section mentor")
    def get_section_mentor(self, obj: SectionOccurrence):
        """Format link to associated section mentor object."""
        return get_admin_link_for(obj.section.mentor, "admin:scheduler_mentor_change")


@admin.register(Attendance)
class AttendanceAdmin(BasePermissionModelAdmin):
    fields = (
        "student",
        "get_student_email",
        "get_section",
        "get_mentor",
        "get_mentor_email",
        "get_date",
        "presence",
    )
    readonly_fields = (
        "get_section",
        "get_mentor",
        "get_mentor_email",
        "get_student",
        "get_student_email",
        "get_date",
    )
    autocomplete_fields = ("sectionOccurrence",)

    list_display = (
        "id",
        "get_student",
        "get_student_email",
        "get_date",
        "presence",
        "get_section",
        "get_spacetimes",
        "get_mentor",
        "get_mentor_email",
    )
    list_filter = (
        "presence",
        ("student__section__mentor__course", admin.RelatedOnlyFieldListFilter),
        *day_filters_on_field("sectionOccurrence__date"),
    )
    search_fields = (
        "student__user__first_name",
        "student__user__last_name",
        "student__section__mentor__user__first_name",
        "student__section__mentor__user__last_name",
        "student__section__spacetimes__location",
        "student__section__spacetimes__day_of_week",
        "presence",
    )
    ordering = ("-sectionOccurrence__date",)

    def get_queryset(self, request):
        queryset = (
            super()
            .get_queryset(request)
            .select_related(
                "student__section", "student__section__mentor__user", "student__user"
            )
        )
        if request.user.is_superuser:
            return queryset
        return queryset.filter(
            student__section__course__in=get_visible_courses(request.user)
        )

    @admin.display(description="Section")
    def get_section(self, obj: Attendance):
        """Format link to the associated section object."""
        return get_admin_link_for(
            obj.section,
            "admin:scheduler_section_change",
            display_text=(
                f"{obj.section.mentor.course.name} section (id {obj.section.id})"
            ),
        )

    @admin.display(description="Spacetimes")
    def get_spacetimes(self, obj: Attendance):
        """Retrieve and format the spacetimes associated with the section."""
        return format_spacetimes(obj.section.spacetimes.all())

    @admin.display(description="Mentor")
    def get_mentor(self, obj: Attendance):
        """Format link to associated mentor object."""
        return get_admin_link_for(
            obj.student.section.mentor, "admin:scheduler_mentor_change"
        )

    @admin.display(description="Mentor email")
    def get_mentor_email(self, obj: Attendance):
        """Retrieve associated mentor email."""
        return obj.student.section.mentor.user.email

    @admin.display(description="Student")
    def get_student(self, obj: Attendance):
        """Format link to associated student object."""
        return get_admin_link_for(obj.student, "admin:scheduler_student_change")

    @admin.display(description="Student email")
    def get_student_email(self, obj: Attendance):
        """Retrieve associated student email."""
        return obj.student.user.email

    @admin.display(description="Date", ordering="sectionOccurrence__date")
    def get_date(self, obj: Attendance):
        """Retrieve the date associated with this attendance object."""
        return get_admin_link_for(
            obj.sectionOccurrence,
            "admin:scheduler_sectionoccurrence_change",
            display_text=obj.sectionOccurrence.date,
        )


@admin.register(Override)
class OverrideAdmin(BasePermissionModelAdmin):
    fields = (
        "date",
        "spacetime",
        "overriden_spacetime",
    )
    autocomplete_fields = (
        "spacetime",
        "overriden_spacetime",
    )

    list_filter = (
        "spacetime__day_of_week",
        "spacetime__section__mentor__course",
    )
    list_display = (
        "date",
        "get_old_spacetime",
        "get_new_spacetime",
    )
    ordering = ("-date",)

    @admin.display(description="Old spacetime")
    def get_old_spacetime(self, obj: Override):
        """Format link to old spacetime object."""
        return get_admin_link_for(obj.spacetime, "admin:scheduler_spacetime_change")

    @admin.display(description="New spacetime")
    def get_new_spacetime(self, obj: Override):
        """Format link to new spacetime object."""
        return get_admin_link_for(
            obj.overriden_spacetime, "admin:scheduler_spacetime_change"
        )
