import datetime
import re
from django.db import models
from django.db.models.fields.related_descriptors import ReverseOneToOneDescriptor
from django.core.exceptions import ObjectDoesNotExist
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.dispatch import receiver
from django.utils import timezone, functional
from rest_framework.serializers import ValidationError
import logging

logger = logging.getLogger(__name__)

logger.info = logger.warning


class DayOfWeekField(models.Field):
    DAYS = ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')

    description = "Represents a single day of the week, ordered Monday - Sunday, backed by a Postgres enum"

    def db_type(self, connection):
        return 'day_of_week'


def day_to_number(day_of_week):
    return DayOfWeekField.DAYS.index(day_of_week)


def week_bounds(date):
    week_start = date - datetime.timedelta(days=date.weekday())
    week_end = week_start + datetime.timedelta(weeks=1)
    return week_start, week_end


class User(AbstractUser):
    priority_enrollment = models.DateTimeField(null=True, blank=True)

    # profile-relevant fields
    bio = models.CharField(max_length=1000, blank=True)
    pronouns = models.CharField(max_length=50, blank=True)
    pronunciation = models.CharField(max_length=50, blank=True)
    is_private = models.BooleanField()

    def can_enroll_in_course(self, course, bypass_enrollment_time=False):
        # check restricted first
        if course.is_restricted and not self.is_whitelisted_for(course):
            return False

        is_associated = (self.student_set.filter(active=True, section__mentor__course=course).count() or
                         self.mentor_set.filter(section__mentor__course=course).count())
        if bypass_enrollment_time:
            return not is_associated
        else:
            if self.priority_enrollment:
                now = timezone.now().astimezone(timezone.get_default_timezone())
                is_valid_enrollment_time = self.priority_enrollment < now < course.enrollment_end
            else:
                is_valid_enrollment_time = course.is_open()
            return is_valid_enrollment_time and not is_associated

    def is_whitelisted_for(self, course: "Course"):
        return not course.is_restricted or self.whitelist.filter(pk=course.pk).exists()

    class Meta:
        indexes = (models.Index(fields=("email",)),)


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


class ReverseOneToOneOrNoneDescriptor(ReverseOneToOneDescriptor):
    def __get__(self, *args, **kwargs):
        try:
            return super().__get__(*args, **kwargs)
        except ObjectDoesNotExist:
            return None


class OneToOneOrNoneField(models.OneToOneField):
    """
    A OneToOneField that returns None if the related object does not exist
    """
    related_accessor_class = ReverseOneToOneOrNoneDescriptor


class Attendance(ValidatingModel):
    class Presence(models.TextChoices):
        PRESENT = "PR", "Present"
        UNEXCUSED_ABSENCE = "UN", "Unexcused absence"
        EXCUSED_ABSENCE = "EX", "Excused absence"

    presence = models.CharField(max_length=2, choices=Presence.choices, blank=True)
    student = models.ForeignKey("Student", on_delete=models.CASCADE)
    sectionOccurrence = models.ForeignKey("SectionOccurrence", on_delete=models.CASCADE)

    def __str__(self):
        return f"{self.sectionOccurrence.date} {self.presence} {self.student.name}"

    @property
    def section(self):
        return self.student.section

    @property
    def week_start(self):
        return week_bounds(self.sectionOccurrence.date)[0]

    class Meta:
        unique_together = ("sectionOccurrence", "student")
        ordering = ("sectionOccurrence",)
        # indexes = (models.Index(fields=("date",)),)


class SectionOccurrence(ValidatingModel):
    """
    SectionOccurrence represents an occurrence of a section and acts as an
    intermediate step between Section and Attendance. Now attendances dont
    have dates but rather are associated with Section Occurrence.
    """
    section = models.ForeignKey("Section", on_delete=models.CASCADE)
    date = models.DateField()
    word_of_the_day = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"SectionOccurrence for {self.section} at {self.date}"

    class Meta:
        unique_together = ("section", "date")
        ordering = ("date",)


class Course(ValidatingModel):
    name = models.SlugField(max_length=16, unique_for_month="enrollment_start")
    title = models.CharField(max_length=100)
    valid_until = models.DateField()
    section_start = models.DateField()
    enrollment_start = models.DateTimeField()
    enrollment_end = models.DateTimeField()
    permitted_absences = models.PositiveSmallIntegerField()
    # time limit for wotd submission;
    # section occurrence date + day limit, rounded to EOD
    word_of_the_day_limit = models.DurationField(null=True, blank=True)

    is_restricted = models.BooleanField(default=False)
    whitelist = models.ManyToManyField("User", blank=True, related_name="whitelist")

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

        # check word of the day limit is in days
        if (
            isinstance(self.word_of_the_day_limit, datetime.timedelta)
            and self.word_of_the_day_limit.seconds > 0
        ):
            raise ValidationError("word of the day limit must be in days")

    def is_open(self):
        now = timezone.now().astimezone(timezone.get_default_timezone())
        return self.enrollment_start < now < self.enrollment_end


class Profile(ValidatingModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    # all students, mentors, and coords should have a field for course
    course = models.ForeignKey(Course, on_delete=models.CASCADE)

    @property
    def name(self):
        return self.user.get_full_name()

    def __str__(self):
        return f"{self.name} ({self.course.name})"

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
        now = timezone.now().astimezone(timezone.get_default_timezone())
        week_start = week_bounds(now.date())[0]
        for spacetime in self.section.spacetimes.all():
            section_day_num = day_to_number(spacetime.day_of_week)
            section_already_held = section_day_num < now.weekday() or (
                section_day_num == now.weekday() and spacetime.start_time < now.time())
            course = self.course
            if self.active and course.section_start <= now.date() < course.valid_until\
                    and not section_already_held and not self.attendance_set.filter(sectionOccurrence__date=week_start+datetime.timedelta(days=section_day_num)).exists():
                if settings.DJANGO_ENV != settings.DEVELOPMENT:
                    logger.info(
                        f"<SectionOccurrence> SO automatically created for student {self.user.email} in course {course.name} for date {now.date()}")
                    logger.info(
                        f"<Attendance> Attendance automatically created for student {self.user.email} in course {course.name} for date {now.date()}")
                so_qs = SectionOccurrence.objects.filter(
                    section=self.section, date=week_start + datetime.timedelta(days=section_day_num))
                if not so_qs.exists():
                    so = SectionOccurrence.objects.create(
                        section=self.section, date=week_start + datetime.timedelta(days=section_day_num))
                else:
                    so = so_qs.get()
                Attendance.objects.create(student=self, sectionOccurrence=so)

    def clean(self):
        super().clean()
        # ensure consistency with two course fields
        if self.section.mentor.course != self.course:
            raise ValidationError("Student must be associated with the same course as the section they are in.")

    class Meta:
        unique_together = ("user", "section")


class Mentor(Profile):
    """
    Represents a given "instance" of a mentor. Every section a mentor teaches in every course should
    have a new Mentor profile.
    """


class Coordinator(Profile):
    """
    This profile is used to allow coordinators to acess the admin page.
    """

    def save(self, *args, **kwargs):
        self.user.is_staff = True
        self.user.save()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.course.name})"

    class Meta:
        unique_together = ("user", "course")


class Section(ValidatingModel):
    # course = models.ForeignKey(Course, on_delete=models.CASCADE)
    capacity = models.PositiveSmallIntegerField()
    mentor = OneToOneOrNoneField(Mentor, on_delete=models.CASCADE, blank=True, null=True)
    description = models.CharField(
        max_length=100,
        blank=True,
        help_text='A brief note to add some extra information about the section, e.g. "EOP" or '
        '"early start".'
    )

    # @functional.cached_property
    # def course(self):
    #     return self.mentor.course

    @functional.cached_property
    def current_student_count(self):
        return self.students.filter(active=True).count()

    def delete(self, *args, **kwargs):
        if self.current_student_count and not kwargs.get('force'):
            raise models.ProtectedError("Cannot delete section with enrolled students", self)
        kwargs.pop('force', None)
        super().delete(*args, **kwargs)

    def clean(self):
        super().clean()
        """
        Checking self.pk is checking if this is a creation (as opposed to an update)
        We can't possibly have spacetimes at creation time (because it's a foreign-key field),
        so we only validate this on updates
        """
        if self.pk and not self.spacetimes.exists():
            raise ValidationError("Section must have at least one Spacetime")

    def __str__(self):
        return "{course} section ({enrolled}/{cap}, {mentor}, {spacetimes})".format(
            course=self.mentor.course.name,
            mentor="(no mentor)" if not self.mentor else self.mentor.name,
            enrolled=self.current_student_count,
            cap=self.capacity,
            spacetimes="|".join(map(str, self.spacetimes.all()))
        )


def worksheet_path(instance, filename):
    # file will be uploaded to MEDIA_ROOT/<course_name>/<filename>
    course_name = str(instance.resource.course.name).replace(" ", "")
    return f'resources/{course_name}/{filename}'


class Resource(ValidatingModel):
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    week_num = models.PositiveSmallIntegerField()
    date = models.DateField()
    topics = models.CharField(blank=True, max_length=100)

    class Meta:
        ordering = ['week_num']

    def clean(self):
        super().clean()
        if self.course.is_restricted:
            raise NotImplementedError("Resources currently cannot be associated with a restricted course.")


class Link(ValidatingModel):
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE)
    name = models.CharField(max_length=200)
    url = models.URLField(max_length=255)


class Worksheet(ValidatingModel):
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    worksheet_file = models.FileField(blank=True, upload_to=worksheet_path)
    solution_file = models.FileField(blank=True, upload_to=worksheet_path)


@receiver(models.signals.post_delete, sender=Worksheet)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Deletes file from filesystem when corresponding
    `Worksheet` object is deleted.
    """
    if instance.worksheet_file:
        instance.worksheet_file.delete(save=False)
    if instance.solution_file:
        instance.solution_file.delete(save=False)


@receiver(models.signals.pre_save, sender=Worksheet)
def auto_delete_file_on_change(sender, instance, **kwargs):
    """
    Deletes old file from filesystem when corresponding
    `Worksheet` object is updated with a new file.
    """
    if not instance.pk:
        return False

    db_obj = Worksheet.objects.get(pk=instance.pk)
    exists = True
    try:
        old_file = db_obj.worksheet_file
    except Worksheet.DoesNotExist:
        exists = False

    if exists:
        new_file = instance.worksheet_file
        if old_file != new_file:
            db_obj.worksheet_file.delete(save=False)

    exists = True
    try:
        old_file = db_obj.solution_file
    except Worksheet.DoesNotExist:
        exists = False

    if exists:
        new_file = instance.solution_file
        if old_file != new_file:
            db_obj.solution_file.delete(save=False)


class Spacetime(ValidatingModel):
    SPACE_REDUCE_REGEX = re.compile(r'\s+')

    location = models.CharField(max_length=200)
    start_time = models.TimeField()
    duration = models.DurationField()
    day_of_week = DayOfWeekField()
    section = models.ForeignKey(Section, on_delete=models.CASCADE, related_name="spacetimes", null=True, blank=True)

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
        return day_to_number(self.day_of_week)

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
        if self.spacetime.day_of_week != self.date.strftime("%A"):
            raise ValidationError("Day of week of spacetime and day of week of date do not match")

    def is_expired(self):
        now = timezone.now().astimezone(timezone.get_default_timezone())
        return self.date < now.date()

    def __str__(self):
        return f"Override for {self.overriden_spacetime.section} : {self.spacetime}"


class Matcher(ValidatingModel):
    course = OneToOneOrNoneField(Course, on_delete=models.CASCADE, blank=True, null=True)
    """
    Serialized assignment of mentors to times.
    [{mentor: int, slot: int, section: {capacity: int, description: str}}, ...]
    """
    assignment = models.JSONField(default=dict, blank=True)
    is_open = models.BooleanField(default=False)

    active = models.BooleanField(default=True)


class MatcherSlot(ValidatingModel):
    matcher = models.ForeignKey(Matcher, on_delete=models.CASCADE)
    """
    Serialized times of the form:
    [{"day", "startTime", "endTime"}, ...]
    Time is in hh:mm 24-hour format
    """
    times = models.JSONField()
    min_mentors = models.PositiveSmallIntegerField()
    max_mentors = models.PositiveSmallIntegerField()

    def clean(self):
        super().clean()
        if self.min_mentors > self.max_mentors:
            raise ValidationError("Min mentors cannot be greater than max mentors")

    class Meta:
        unique_together = ("matcher", "times")


class MatcherPreference(ValidatingModel):
    slot = models.ForeignKey(MatcherSlot, on_delete=models.CASCADE)
    mentor = models.ForeignKey(Mentor, on_delete=models.CASCADE)
    preference = models.PositiveSmallIntegerField()

    class Meta:
        unique_together = ("slot", "mentor")
