import datetime
from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class User(AbstractUser):
    pass


class Attendance(models.Model):
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
        return self.attendee.section

    @property
    def week_start(self):
        return self.get_week_start_from_date()

    def get_week_start_from_date(self):
        day_of_week = timezone.now().weekday()
        return self.date - datetime.timedelta(days=day_of_week)

    class Meta:
        unique_together = ("date", "student")


class Course(models.Model):
    name = models.SlugField(max_length=100, unique=True)
    valid_until = models.DateField()
    enrollment_start = models.DateTimeField()
    enrollment_end = models.DateTimeField()

    def __str__(self):
        return self.name


class Profile(models.Model):
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
        "Section", on_delete=models.CASCADE, blank=True, null=True
    )


class Mentor(Profile):
    pass


class Section(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    spacetime = models.OneToOneField("SpacetimeProxy", on_delete=models.CASCADE)
    capacity = models.PositiveSmallIntegerField()
    mentor = models.ForeignKey(Mentor, on_delete=models.SET_NULL, blank=True, null=True)

    @property
    def current_student_count(self):
        return self.students.count()

    current_student_count.fget.short_description = "Number of students enrolled"

    def __str__(self):
        return "{course} section ({enrolled}/{cap}, {mentor}, {spacetime})".format(
            course=self.course.name,
            mentor="(no mentor)" if not self.mentor else self.mentor.name,
            enrolled=self.current_student_count,
            cap=self.capacity,
            spacetime=str(self.default_spacetime),
        )

    class Meta:
        unique_together = ("course", "spacetime")


class Spacetime(models.Model):
    MONDAY = "M"
    TUESDAY = "TU"
    WEDNESDAY = "W"
    THURSDAY = "TH"
    FRIDAY = "F"
    SATURDAY = "SA"
    SUNDAY = "SU"
    DAY_OF_WEEK_CHOICES = (
        (MONDAY, "Monday"),
        (TUESDAY, "Tuesday"),
        (WEDNESDAY, "Wednesday"),
        (THURSDAY, "Thursday"),
        (FRIDAY, "Friday"),
        (SATURDAY, "Saturday"),
        (SUNDAY, "Sunday"),
    )
    location = models.CharField(max_length=100)
    start_time = models.TimeField()
    duration = models.DurationField()
    day_of_week = models.CharField(max_length=2, choices=DAY_OF_WEEK_CHOICES)

    def __str__(self):
        formatted_time = self.start_time.strftime("%I:%M %p")
        num_minutes = int(self.duration.total_seconds() // 60)
        return (
            f"{self.location} {self.day_of_week} {formatted_time} for {num_minutes} min"
        )


class SpacetimeProxy(Spacetime):
    def __getattribute__(self, name):
        if self.override and name in (
            "location",
            "start_time",
            "duration",
            "day_of_week",
        ):
            return getattr(self.override.spacetime, name)
        return super().__getattribute__(name)

    class Meta:
        proxy = True


class Override(models.Model):
    spacetime = models.OneToOneField(
        SpacetimeProxy, on_delete=models.CASCADE, related_name="+"
    )  # related_name='+' means Django does not create the reverse relation
    overriden_spacetime = models.OneToOneField(SpacetimeProxy, on_delete=models.CASCADE)
    date = models.DateField()

    def __str__(self):
        return f"Override for {self.section} : {self.spacetime}"
