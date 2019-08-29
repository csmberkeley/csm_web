import datetime
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from rest_framework.serializers import ValidationError


class User(AbstractUser):
    pass


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
        day_of_week = timezone.now().weekday()
        return self.date - datetime.timedelta(days=day_of_week)

    class Meta:
        unique_together = ("date", "student")


class Course(ValidatingModel):
    name = models.SlugField(max_length=100, unique_for_month="enrollment_start")
    valid_until = models.DateField()
    enrollment_start = models.DateTimeField()
    enrollment_end = models.DateTimeField()

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
        return f"{self.user.first_name} {self.user.last_name}"

    def __str__(self):
        if self.section:
            return f"{self.name} ({self.section.course.name})"
        return self.name

    class Meta:
        abstract = True


class Student(Profile):
    section = models.ForeignKey(
        "Section",
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name="students",
    )

    class Meta:
        unique_together = ("user", "section")


class Mentor(Profile):
    pass


class Section(ValidatingModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    spacetime = models.OneToOneField("Spacetime", on_delete=models.CASCADE)
    capacity = models.PositiveSmallIntegerField()
    mentor = models.ForeignKey(Mentor, on_delete=models.SET_NULL, blank=True, null=True)

    @property
    def current_student_count(self):
        return self.students.count()

    current_student_count.fget.short_description = "Number of students enrolled"

    def clean(self):
        super().clean()
        if self.students.count() > self.capacity:
            raise ValidationError(
                "Number of enrolled students exceeds section capacity"
            )

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

    @property
    def location(self):
        if hasattr(self, "override"):
            return self.override.spacetime.location
        return self._location

    @property
    def start_time(self):
        if hasattr(self, "override"):
            return self.override.spacetime.start_time
        return self._start_time

    @property
    def duration(self):
        if hasattr(self, "override"):
            return self.override.spacetime.duration
        return self._duration

    @property
    def day_of_week(self):
        if hasattr(self, "override"):
            return self.override.spacetime.day_of_week
        return self._day_of_week

    def __str__(self):
        formatted_time = self.start_time.strftime("%I:%M %p")
        num_minutes = int(self.duration.total_seconds() // 60)
        return (
            f"{self.location} {self.day_of_week} {formatted_time} for {num_minutes} min"
        )


class Override(ValidatingModel):
    spacetime = models.OneToOneField(
        Spacetime, on_delete=models.CASCADE, related_name="+"
    )  # related_name='+' means Django does not create the reverse relation
    overriden_spacetime = models.OneToOneField(Spacetime, on_delete=models.CASCADE)
    date = models.DateField()

    def clean(self):
        super().clean()
        if self.spacetime == self.overriden_spacetime:
            raise ValidationError("A spacetime cannot override itself")

    def __str__(self):
        return f"Override for {self.overriden_spacetime.section} : {self.spacetime}"
