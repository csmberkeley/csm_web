import datetime
import re
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.utils import timezone, functional
from rest_framework.serializers import ValidationError
import logging

logger = logging.getLogger(__name__)

logger.info = logger.warn


def should_have_two_spacetimes(course_name):
    """
    Returns true if the course_name is a course with two spacetimes.
    Welp.
    """
    return course_name in ["CS70"]


def week_bounds(date):
    week_start = date - datetime.timedelta(days=date.weekday())
    week_end = week_start + datetime.timedelta(weeks=1)
    return week_start, week_end


class User(AbstractUser):
    def can_enroll_in_course(self, course):
        return course.is_open() and (
            not (self.student_set.filter(active=True, section__course=course).count() or
                 self.mentor_set.filter(section__course=course).count())
        )


class ValidatingModel(models.Model):
    """
    By default, Django models do not validate on save!
    This abstract class fixes that insanity
    """

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    class Meta:
        abstract = True


class Attendance(ValidatingModel):
    class Presence(models.TextChoices):
        PRESENT = "PR", "Present"
        UNEXCUSED_ABSENCE = "UN", "Unexcused absence"
        EXCUSED_ABSENCE = "EX", "Excused absence"

    date = models.DateField()
    presence = models.CharField(max_length=2, choices=Presence.choices, blank=True)
    student = models.ForeignKey("Student", on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.date} {self.presence} {self.student.name}"

    @property
    def section(self):
        return self.student.section

    @property
    def week_start(self):
        return week_bounds(self.date)[0]

    class Meta:
        unique_together = ("date", "student")
        ordering = ("date",)
        indexes = (models.Index(fields=("date",)),)


class Course(ValidatingModel):
    name = models.SlugField(max_length=16, unique_for_month="enrollment_start")
    title = models.CharField(max_length=100)
    valid_until = models.DateField()
    section_start = models.DateField()
    enrollment_start = models.DateTimeField()
    enrollment_end = models.DateTimeField()
    permitted_absences = models.PositiveSmallIntegerField()

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.section_start <= self.enrollment_start.date():
            raise ValidationError("section_start must be after enrollment_start")
        if self.enrollment_end <= self.enrollment_start:
            raise ValidationError("enrollment_end must be after enrollment_start")
        if self.valid_until < self.enrollment_end.date():
            raise ValidationError("valid_until must be after enrollment_end")

    def is_open(self):
        return self.enrollment_start < timezone.now() < self.enrollment_end


class Profile(ValidatingModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    @property
    def name(self):
        return self.user.get_full_name()

    def __str__(self):
        if hasattr(self, "section") and self.section:
            return f"{self.name} ({self.section.course.name})"
        return self.name

    class Meta:
        abstract = True


class Student(Profile):
    """
    Represents a given "instance" of a student. Every section in which a student enrolls should
    have a new Student profile.
    """
    section = models.ForeignKey("Section", on_delete=models.CASCADE, related_name="students")
    active = models.BooleanField(default=True, help_text="An inactive student is a dropped student.")
    banned = models.BooleanField(
        default=False, help_text="A banned student cannot enroll in another section for the course they are banned from")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        """
        Create an attendance for this week for the student if their section hasn't already been held this week
        and no attendance for this week already exists.
        """
        now = timezone.now()
        this_week = week_bounds(now.date())
        section_day_num = Spacetime.DayOfWeek.values.index(self.section.spacetime.day_of_week)
        section_already_held = section_day_num < now.weekday() or (
            section_day_num == now.weekday() and self.section.spacetime.start_time < now.time())
        course = self.section.course
        if self.active and course.section_start <= now.date() < course.valid_until\
                and not section_already_held and not self.attendance_set.filter(date__range=this_week).exists():
            if settings.DJANGO_ENV != settings.DEVELOPMENT:
                logger.info(
                    f"<Attendance> Attendance automatically created for student {self.user.email} in course {course.name} for date {now.date()}")
            Attendance.objects.create(student=self, date=this_week[0])

    class Meta:
        unique_together = ("user", "section")


class Mentor(Profile):
    """
    Represents a given "instance" of a mentor. Every section a mentor teaches in every course should
    have a new Mentor profile.
    """
    pass


class Coordinator(Profile):
    """
    This profile is used to allow coordinators to acess the admin page.
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE)

    def save(self, *args, **kwargs):
        self.user.is_staff = True
        self.user.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.course.name})"


class Section(ValidatingModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    spacetime = models.ForeignKey(
        "Spacetime",
        # If spacetime_70 isn't present, this field can be removed
        related_name="section",
        on_delete=models.CASCADE,
        help_text="The recurring time and location of a section. This can be temporarily overriden "
        "by the mentor, in which case the admin page will display the overriding times."
    )
    # This nullable field is ideally a hack to accomodate CS70 having 2 sections per week.
    # I pray that it may one day be removed in favor of a more sustainable design.
    # In fact, it may be more accurate to put the FK on the Spacetime model instead...
    spacetime_70 = models.ForeignKey(
        "Spacetime",
        # If spacetime_70 isn't present, this field can be removed
        related_name="section_70",
        blank=True,
        null=True,
        on_delete=models.CASCADE,
        help_text="A second recurring time and location for a section. This field is null for "
        "courses that only have one section per week."
    )
    capacity = models.PositiveSmallIntegerField()
    mentor = models.OneToOneField(Mentor, on_delete=models.CASCADE, blank=True, null=True)
    description = models.CharField(
        max_length=100,
        blank=True,
        help_text='A brief note to add some extra information about the section, e.g. "EOP" or '
        '"early start".'
    )

    @functional.cached_property
    def current_student_count(self):
        return self.students.filter(active=True).count()

    def delete(self, *args, **kwargs):
        if self.current_student_count and not kwargs.get('force'):
            raise models.ProtectedError("Cannot delete section with enrolled students", self)
        kwargs.pop('force', None)
        super().delete(*args, **kwargs)

    def __str__(self):
        return "{course} section ({enrolled}/{cap}, {mentor}, {spacetime})".format(
            course=self.course.name,
            mentor="(no mentor)" if not self.mentor else self.mentor.name,
            enrolled=self.current_student_count,
            cap=self.capacity,
            spacetime=str(self.spacetime),
        )

    class Meta:
        unique_together = ("course", "spacetime")


class Spacetime(ValidatingModel):
    class DayOfWeek(models.TextChoices):
        MONDAY = "Mon"
        TUESDAY = "Tue"
        WEDNESDAY = "Wed"
        THURSDAY = "Thu"
        FRIDAY = "Fri"
        SATURDAY = "Sat"
        SUNDAY = "Sun"

    DAY_INDEX = tuple(day for day, _ in DayOfWeek.choices)
    SPACE_REDUCE_REGEX = re.compile(r'\s+')

    location = models.CharField(max_length=200)
    start_time = models.TimeField()
    duration = models.DurationField()
    day_of_week = models.CharField(max_length=3, choices=DayOfWeek.choices)

    @property
    def override(self):
        return self._override if (hasattr(self, "_override") and not self._override.is_expired()) else None

    @property
    def end_time(self):
        # Time does not support addition/subtraction,
        # so we have to create a datetime wrapper over start_time to add it to duration
        return (datetime.datetime(year=1, day=1, month=1,
                                  hour=self.start_time.hour,
                                  minute=self.start_time.minute,
                                  second=self.start_time.second)
                + self.duration).time()

    def day_number(self):
        return self.DAY_INDEX.index(self.day_of_week)

    def __str__(self):
        formatted_time = self.start_time.strftime("%I:%M %p")
        num_minutes = int(self.duration.total_seconds() // 60)
        return f"{self.location} {self.day_of_week} {formatted_time} for {num_minutes} min"

    def save(self, *args, **kwargs):
        self.location = re.sub(self.SPACE_REDUCE_REGEX, ' ', self.location).strip()
        super().save(*args, **kwargs)


class Override(ValidatingModel):
    # related_name='+' means Django does not create the reverse relation
    spacetime = models.OneToOneField(Spacetime, on_delete=models.CASCADE, related_name="+")
    overriden_spacetime = models.OneToOneField(Spacetime, related_name="_override", on_delete=models.CASCADE)
    date = models.DateField()

    def clean(self):
        super().clean()
        if self.spacetime == self.overriden_spacetime:
            raise ValidationError("A spacetime cannot override itself")
        if self.spacetime.day_of_week != self.date.strftime("%a")[:3]:
            raise ValidationError("Day of week of spacetime and day of week of date do not match")

    def is_expired(self):
        return self.date < timezone.now().date()

    def __str__(self):
        return f"Override for {self.overriden_spacetime.section} : {self.spacetime}"
