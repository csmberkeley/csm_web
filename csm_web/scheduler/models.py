import datetime
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from rest_framework.serializers import ValidationError


class User(AbstractUser):
    def can_enroll_in_course(self, course):
        return not (self.student_set.filter(active=True, section__course=course).count() or
                    self.mentor_set.filter(section__course=course).count())


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
    PRESENT = "PR"
    UNEXCUSED_ABSENCE = "UN"
    EXCUSED_ABSENCE = "EX"
    PRESENCE_CHOICES = (
        (PRESENT, "Present"),
        (UNEXCUSED_ABSENCE, "Unexcused absence"),
        (EXCUSED_ABSENCE, "Excused absence"),
    )
    date = models.DateField()
    presence = models.CharField(max_length=2, choices=PRESENCE_CHOICES, blank=True)
    student = models.ForeignKey("Student", on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.date} {self.presence} {self.student.name}"

    @property
    def section(self):
        return self.student.section

    @property
    def week_start(self):
        day_of_week = self.date.weekday()
        return self.date - datetime.timedelta(days=day_of_week)

    class Meta:
        unique_together = ("date", "student")


class Course(ValidatingModel):
    name = models.SlugField(max_length=100, unique_for_month="enrollment_start")
    valid_until = models.DateField()
    enrollment_start = models.DateTimeField()
    enrollment_end = models.DateTimeField()
    permitted_absences = models.PositiveSmallIntegerField()

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        if self.enrollment_end <= self.enrollment_start:
            raise ValidationError("enrollment_end must be after enrollment_start")
        if type(self.enrollment_end) == datetime.datetime:
            enrollment_end = self.enrollment_end.date()
        else:
            enrollment_end = self.enrollment_end
        if self.valid_until < enrollment_end:
            raise ValidationError("valid_until must be after enrollment_end")


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
    have a new Mentor profile.
    """
    section = models.ForeignKey("Section", on_delete=models.CASCADE, blank=True, null=True, related_name="students")
    active = models.BooleanField(default=True, help_text="An inactive student is a dropped student.")

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

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.course.name})"


class Section(ValidatingModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    spacetime = models.OneToOneField(
        "Spacetime",
        on_delete=models.CASCADE,
        help_text="The recurring time and location of a section. This can be temporarily overriden "
        "by the mentor, in which case the admin page will display the overriding times."
    )
    capacity = models.PositiveSmallIntegerField()
    mentor = models.OneToOneField(Mentor, on_delete=models.SET_NULL, blank=True, null=True)
    description = models.CharField(
        max_length=100,
        blank=True,
        help_text='A brief note to add some extra information about the section, e.g. "EOP" or '
        '"early start".'
    )

    @property
    def current_student_count(self):
        return self.students.filter(active=True).count()

    current_student_count.fget.short_description = "Number of students enrolled"

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
    MONDAY = "Mon"
    TUESDAY = "Tue"
    WEDNESDAY = "Wed"
    THURSDAY = "Thu"
    FRIDAY = "Fri"
    SATURDAY = "Sat"
    SUNDAY = "Sun"
    DAY_OF_WEEK_CHOICES = (
        (MONDAY, "Monday"),
        (TUESDAY, "Tuesday"),
        (WEDNESDAY, "Wednesday"),
        (THURSDAY, "Thursday"),
        (FRIDAY, "Friday"),
        (SATURDAY, "Saturday"),
        (SUNDAY, "Sunday"),
    )
    DAY_INDEX = tuple(day for day, _ in DAY_OF_WEEK_CHOICES)

    _location = models.CharField(max_length=100)
    _start_time = models.TimeField()
    _duration = models.DurationField()
    _day_of_week = models.CharField(max_length=3, choices=DAY_OF_WEEK_CHOICES)

    """
    Unfortunately the Django models.Model class doesn't play nice with standard Python metaprogramming
    functionality like __getattribute__, and Django doesn't allow you to shadow fields in a descendant class,
    so we have to resort to this boilerplate @property solution in order to have Spacetime 'magically' return
    the overriden value if there is one
    """

    def has_valid_override(self):
        return self.has_override() and not self.override.is_expired()

    def has_override(self):
        return hasattr(self, "override")

    def day_number(self):
        return self.DAY_INDEX.index(self.day_of_week)

    @property
    def location(self):
        if self.has_valid_override():
            return self.override.spacetime.location
        return self._location

    @property
    def start_time(self):
        if self.has_valid_override():
            return self.override.spacetime.start_time
        return self._start_time

    @property
    def duration(self):
        if self.has_valid_override():
            return self.override.spacetime.duration
        return self._duration

    @property
    def day_of_week(self):
        if self.has_valid_override():
            return self.override.spacetime.day_of_week
        return self._day_of_week

    def get_day_of_week_display(self):
        return dict(Spacetime.DAY_OF_WEEK_CHOICES).get(self.day_of_week, "Invalid day of week")

    @property
    def end_time(self):
        return (datetime.datetime(year=1, day=1, month=1,
                                  hour=self.start_time.hour,
                                  minute=self.start_time.minute,
                                  second=self.start_time.second)
                + self.duration).time()

    def __str__(self):
        formatted_time = self.start_time.strftime("%I:%M %p")
        num_minutes = int(self.duration.total_seconds() // 60)
        return f"{self.location} {self.day_of_week} {formatted_time} for {num_minutes} min"


class Override(ValidatingModel):
    # related_name='+' means Django does not create the reverse relation
    spacetime = models.OneToOneField(Spacetime, on_delete=models.CASCADE, related_name="+")
    overriden_spacetime = models.OneToOneField(Spacetime, on_delete=models.CASCADE)
    date = models.DateField()

    def clean(self):
        super().clean()
        if self.spacetime == self.overriden_spacetime:
            raise ValidationError("A spacetime cannot override itself")
        if self.spacetime.day_of_week != self.date.strftime("%a")[:3]:
            raise ValidationError("Day of week of spacetime and day of week of date do not matchf")

    def is_expired(self):
        return self.date < timezone.now().date()

    def __str__(self):
        return f"Override for {self.overriden_spacetime.section} : {self.spacetime}"
