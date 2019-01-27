from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    pass


class ActivatableModel(models.Model):
    active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class Attendance(models.Model):
    PRESENT = "PR"
    UNEXCUSED_ABSENCE = "UN"
    EXCUSED_ABSENCE = "EX"
    PRESENCE_CHOICES = (
        (PRESENT, "Present"),
        (UNEXCUSED_ABSENCE, "Unexcused absence"),
        (EXCUSED_ABSENCE, "Excused absence"),
    )
    section = models.ForeignKey("Section", on_delete=models.CASCADE)
    week_start = models.DateField()
    presence = models.CharField(max_length=2, choices=PRESENCE_CHOICES, blank=True)
    attendee = models.ForeignKey("Profile", on_delete=models.CASCADE)

    def __str__(self):
        return "%s %s %s" % (
            self.week_start,
            self.presence,
            self.attendee.user.username,
        )

    @property
    def leader(self):
        return self.section.mentor


class Course(models.Model):
    name = models.SlugField(max_length=100)
    valid_until = models.DateField()
    enrollment_start = models.DateTimeField()
    enrollment_end = models.DateTimeField()

    def __str__(self):
        return self.name


class Profile(ActivatableModel):
    STUDENT = "ST"
    JUNIOR_MENTOR = "JM"
    SENIOR_MENTOR = "SM"
    COORDINATOR = "CO"
    ROLE_CHOICES = (
        (STUDENT, "Student"),
        (JUNIOR_MENTOR, "Junior Mentor"),
        (SENIOR_MENTOR, "Senior Mentor"),
        (COORDINATOR, "Coordinator"),
    )
    ROLE_MAP = dict(ROLE_CHOICES)

    leader = models.ForeignKey(
        "self",
        on_delete=models.CASCADE,
        related_name="followers",
        blank=True,
        null=True,
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    role = models.CharField(max_length=2, choices=ROLE_CHOICES)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    section = models.ForeignKey(
        "Section", on_delete=models.CASCADE, blank=True, null=True
    )

    def __str__(self):
        title = "{course} {role}".format(
            course=self.course.name, role=Profile.ROLE_MAP[self.role]
        )
        if self.section:
            section = "for {section}".format(section=self.section)
        else:
            section = ""
        username = "({username})".format(username=self.user.username)

        return " ".join(x for x in (title, section, username) if x)


class Section(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    default_spacetime = models.OneToOneField("Spacetime", on_delete=models.CASCADE)
    capacity = models.PositiveSmallIntegerField()

    @property
    def students(self):
        return self.profile_set.filter(role=Profile.STUDENT)

    @property
    def mentor(self):
        mentor_profiles = self.profile_set.exclude(role=Profile.STUDENT)
        assert mentor_profiles.count() <= 1
        return mentor_profiles.first()

    @property
    def current_student_count(self):
        return self.active_students.count()

    @property
    def leader(self):
        return self.mentor

    @property
    def active_students(self):
        return self.students.filter(active=True)

    def __str__(self):
        return "{course} section ({spacetime})".format(
            course=self.course.name, spacetime=str(self.default_spacetime)
        )


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
        return "%s %s %s for %s min" % (
            self.location,
            self.day_of_week,
            str(self.start_time),
            str(self.duration),
        )


class Override(models.Model):
    spacetime = models.OneToOneField(Spacetime, on_delete=models.CASCADE)
    week_start = models.DateField()
    section = models.ForeignKey(Section, on_delete=models.CASCADE)

    @property
    def leader(self):
        return self.section.mentor

    def __str__(self):
        "Override for week of %s, %s" % (str(self.section), str(self.spacetime))
