import datetime

from django.core.management import call_command
from django.utils import timezone
from scheduler.models import Course, Mentor, Section, Spacetime, User

NOW = timezone.now().astimezone(timezone.get_default_timezone())


def now_minus(days: int):
    """Get date `days` prior to now"""
    return NOW - datetime.timedelta(days=days)


def now_plus(days: int):
    """Get date `days` after now"""
    return NOW + datetime.timedelta(days=days)


def setup():
    """Set up courses and sections for course menu."""
    # create demo_user
    call_command("createtestuser", silent=True)

    # NOW < start < end
    cs61a = Course.objects.create(
        name="CS61A",
        title="Structure and Interpretation of Computer Programs",
        permitted_absences=2,
        # NOW
        enrollment_start=now_plus(10),
        section_start=now_plus(15),
        enrollment_end=now_plus(20),
        valid_until=now_plus(25),
    )
    # start < NOW < end
    Course.objects.create(
        name="CS61B",
        title="Data Structures",
        enrollment_start=now_minus(15),
        section_start=now_minus(10),
        # NOW
        enrollment_end=now_plus(10),
        valid_until=now_plus(15),
        permitted_absences=2,
    )
    # start < end < NOW
    Course.objects.create(
        name="CS61C",
        title="Machine Structures",
        permitted_absences=2,
        enrollment_start=now_minus(15),
        section_start=now_minus(10),
        enrollment_end=now_minus(10),
        # NOW
        valid_until=now_plus(15),
    )

    mentor_1_user = User.objects.create(
        username="mentor_1",
        email="mentor_1@berkeley.edu",
        first_name="Mentor",
        last_name="1",
    )
    mentor_1 = Mentor.objects.create(user=mentor_1_user, course=cs61a)
    section = Section.objects.create(
        mentor=mentor_1,
        capacity=5,
        description="",
    )
    Spacetime.objects.create(
        location="Cory 400",
        start_time="11:00:00",
        duration="01:00:00",
        day_of_week="Monday",
        section=section,
    )
    Spacetime.objects.create(
        location="Cory 400",
        start_time="11:00:00",
        duration="01:00:00",
        day_of_week="Tuesday",
        section=section,
    )


def setup_priority_enrollment_past():
    """
    Set up user with past priority enrollment time.
    """
    setup()
    user = User.objects.get(username="demo_user")
    user.priority_enrollment = now_minus(5)
    user.save()


def setup_priority_enrollment_future():
    """
    Set up user wtih future priority enrollment time.
    """
    setup()
    user = User.objects.get(username="demo_user")
    user.priority_enrollment = now_plus(5)
    user.save()
