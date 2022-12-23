import datetime

from django.core.management import call_command
from django.utils import timezone
from scheduler.models import (
    Attendance,
    Course,
    Mentor,
    Section,
    SectionOccurrence,
    Spacetime,
    Student,
    User,
)

NOW = timezone.now().astimezone(timezone.get_default_timezone())


def now_minus(days: int):
    """Get days `days` prior to now"""
    return NOW - datetime.timedelta(days=days)


def now_plus(days: int):
    """Get days `days` after now"""
    return NOW + datetime.timedelta(days=days)


def _setup_common():
    call_command("createtestuser", silent=True)

    user = User.objects.get(username="demo_user")
    cs61a = Course.objects.create(
        name="CS61A",
        title="Structure and Interpretation of Computer Programs",
        permitted_absences=2,
        enrollment_start=now_minus(30),
        section_start=now_minus(15),
        enrollment_end=now_plus(15),
        valid_until=now_plus(30),
    )

    # create mentor for section
    mentor_user = User.objects.create(
        username="testmentor",
        email="testmentor@berkeley.edu",
        first_name="Test",
        last_name="Mentor",
    )
    mentor = Mentor.objects.create(user=mentor_user, course=cs61a)

    # create section
    section = Section.objects.create(
        mentor=mentor, capacity=5, description="test section"
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Monday",
        start_time="11:00:00",
        duration="01:00:00",
        location="Cory 400",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Tuesday",
        start_time="14:00:00",
        duration="01:00:00",
        location="Soda 380",
    )

    # create student in section
    student = Student.objects.create(user=user, course=cs61a, section=section)

    # delete existing occurrences
    SectionOccurrence.objects.filter(section=section).delete()

    # create section occurrences and attendances for two days
    so_past = SectionOccurrence.objects.create(
        section=section, date=now_minus(2).date()
    )
    so_future = SectionOccurrence.objects.create(
        section=section, date=now_plus(2).date()
    )

    Attendance.objects.create(student=student, sectionOccurrence=so_past)
    Attendance.objects.create(student=student, sectionOccurrence=so_future)


def setup_wotd():
    """Setup section with an existing word of the day"""
    _setup_common()

    mentor = Mentor.objects.get(user__username="testmentor")
    section = Section.objects.get(mentor=mentor)

    # create word of the day for past section occurrence
    so_past = SectionOccurrence.objects.get(section=section, date=now_minus(2).date())
    so_past.word_of_the_day = "wordoftheday"
    so_past.save()


def setup_wotd_with_existing_attendance():
    """
    Setup section with an existing word of the day,
    along with an existing attendance taken prior.
    """
    # create wotd for past occurrence
    setup_wotd()

    student = Student.objects.get(user__username="demo_user")
    mentor = Mentor.objects.get(user__username="testmentor")
    section = Section.objects.get(mentor=mentor)

    # create word of the day for future occurrence too
    so_future = SectionOccurrence.objects.get(section=section, date=now_plus(2).date())
    so_future.word_of_the_day = "password"
    so_future.save()

    # set attendance for past occurrence
    so_past = SectionOccurrence.objects.get(section=section, date=now_minus(2).date())
    attendance_past = Attendance.objects.get(student=student, sectionOccurrence=so_past)
    attendance_past.presence = "UN"
    attendance_past.save()


def setup_wotd_with_deadline():
    """
    Setup section with a deadline for submitting the word of the day.
    """
    # create wotd for past occurrence
    setup_wotd()

    mentor = Mentor.objects.get(user__username="testmentor")
    section = Section.objects.get(mentor=mentor)

    # create word of the day for future occurrence too
    so_future = SectionOccurrence.objects.get(section=section, date=now_plus(2).date())
    so_future.word_of_the_day = "password"
    so_future.save()

    # set deadline for the course for one day
    course = mentor.course
    course.word_of_the_day_limit = datetime.timedelta(days=1)
    course.save()
