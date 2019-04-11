from django.db import models
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from django.template.defaultfilters import slugify
from django.contrib.auth.models import User


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

    class Meta:
        unique_together = ("section", "week_start", "attendee")


class Course(models.Model):
    name = models.SlugField(max_length=100)
    valid_until = models.DateField()
    enrollment_start = models.DateTimeField()
    enrollment_end = models.DateTimeField()

    def __str__(self):
        return self.name

    class Meta:
        unique_together = ("name",)


class Profile(ActivatableModel):
    STUDENT = "ST"
    JUNIOR_MENTOR = "JM"
    ASSOCIATE_MENTOR = "AM"
    SENIOR_MENTOR = "SM"
    COORDINATOR = "CO"
    ROLE_CHOICES = (
        (STUDENT, "Student"),
        (JUNIOR_MENTOR, "Junior Mentor"),
        (ASSOCIATE_MENTOR, "Associate Mentor"),
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
    role = models.CharField(max_length=2, choices=ROLE_CHOICES, blank=True)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    section = models.ForeignKey(
        "Section", on_delete=models.CASCADE, blank=True, null=True
    )

    def clean(self):
        if self.section:
            mentor_set = self.section._get_mentor_set()
            if mentor_set.count() > 1:
                raise ValidationError(_("Cannot save section with more than 1 mentor!"))
            if self.course != self.section.course:
                raise ValidationError(_("Profile course must match section course!"))

    @property
    def name(self):
        return f"{self.user.first_name} {self.user.last_name}"

    def __str__(self):
        return f"{self.course.name} {self.role} - {self.name}"


class Section(models.Model):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    default_spacetime = models.OneToOneField("Spacetime", on_delete=models.CASCADE)
    capacity = models.PositiveSmallIntegerField()

    def _get_mentor_set(self):
        # excluding STUDENT doesn't work because of empty role
        return self.profile_set.filter(
            role__in=[
                Profile.JUNIOR_MENTOR,
                Profile.ASSOCIATE_MENTOR,
                Profile.SENIOR_MENTOR,
                Profile.COORDINATOR,
            ]
        )

    @property
    def students(self):
        return self.profile_set.filter(role=Profile.STUDENT)

    @property
    def mentor(self):
        mentor_profiles = mentor_profiles = self._get_mentor_set()
        assert mentor_profiles.count() <= 1
        return mentor_profiles.first()

    @property
    def current_student_count(self):
        return self.active_students.count()

    current_student_count.fget.short_description = "Number of students enrolled"

    @property
    def leader(self):
        return self.mentor

    @property
    def active_students(self):
        return self.students.filter(active=True)

    def __str__(self):
        return "{course} section ({enrolled}/{cap}, {mentor}, {spacetime})".format(
            course=self.course.name,
            mentor="(no mentor)" if not self.mentor else self.mentor.name,
            enrolled=self.current_student_count,
            cap=self.capacity,
            spacetime=str(self.default_spacetime),
        )

    class Meta:
        unique_together = ("course", "default_spacetime")


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


class Override(models.Model):
    spacetime = models.OneToOneField(Spacetime, on_delete=models.CASCADE)
    week_start = models.DateField()
    section = models.ForeignKey(Section, on_delete=models.CASCADE)

    @property
    def leader(self):
        return self.section.mentor

    def __str__(self):
        return f"Override for week of {self.section} {self.spacetime}"


class Flag(models.Model):
    on = models.BooleanField()


# class ImposedEvent(model.Model):
#     """ Imposed Event Model. """
#     type =
#     event_bitstring =
#     active = models.BooleanField()


class RoomAvailabilities(models.Model):
    ### Create Enums for the rooms
    Cory144MB = "Cory-144MB"
    Cory258 = "Cory-258"
    Cory400 = "Cory-400"
    Cory504 = "Cory-504"
    Cory521 = "Cory-521"
    Cory531 = "Cory-531"
    Cory540AB = "Cory-540AB"
    Cory557 = "Cory-557"
    CoryClassroom293 = "Cory-Classroom-293"
    CoryClassroom299 = "Cory-Classroom-299"
    Soda306 = "Soda-306"
    Soda310 = "Soda-310"
    Soda320 = "Soda-320"
    Soda373 = "Soda-373"
    Soda380 = "Soda-380"
    Soda405 = "Soda-405"
    Soda430_438 = "Soda-430-438"
    Soda511 = "Soda-511"
    Soda606 = "Soda-606"
    SodaAlcove283E = "Soda-Alcove-283E"
    SodaAlcove283H = "Soda-Alcove-283H"
    SodaAlcove283A = "Soda-Alcove-341A"
    SodaAlcove283B = "Soda-Alcove-341B"
    SodaAlcove411 = "Soda-Alcove-411"
    SodaAlcove611 = "Soda-Alcove-611"

    ROOM_CHOICES = (
        (Cory144MB, "Cory-144MB"),
        (Cory258, "Cory-258"),
        (Cory400, "Cory-400"),
        (Cory504, "Cory-504"),
        (Cory521, "Cory-521"),
        (Cory531, "Cory-531"),
        (Cory540AB, "Cory-540AB"),
        (Cory557, "Cory-557"),
        (CoryClassroom293, "Cory-Classroom-293"),
        (CoryClassroom299, "Cory-Classroom-299"),
        (Soda306, "Soda-306"),
        (Soda310, "Soda-310"),
        (Soda320, "Soda-320"),
        (Soda373, "Soda-373"),
        (Soda380, "Soda-380"),
        (Soda405, "Soda-405"),
        (Soda430_438, "Soda-430-438"),
        (Soda511, "Soda-511"),
        (Soda606, "Soda-606"),
        (SodaAlcove283E, "Soda-Alcove-283E"),
        (SodaAlcove283H, "Soda-Alcove-283H"),
        (SodaAlcove283A, "Soda-Alcove-341A"),
        (SodaAlcove283B, "Soda-Alcove-341B"),
        (SodaAlcove411, "Soda-Alcove-411"),
        (SodaAlcove611, "Soda-Alcove-611"),
    )
    ROOM_CHOICES = PotentialRooms.ROOM_CHOICES

    room_name = models.CharField(max_length=50, choices=ROOM_CHOICES)
    availability_bitstring = models.BinaryField()
