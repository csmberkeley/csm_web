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


def setup_unrelated_section(enrollment_open=True):
    """Set up a restricted section unrelated to demo_user."""
    call_command("createtestuser")

    # set up section
    mentor_user = User.objects.create(
        username="testmentor",
        first_name="Test",
        last_name="Mentor",
        email="testmentor@berkeley.edu",
    )
    if enrollment_open:
        cs61a = Course.objects.create(
            name="CS61A",
            title="Structure and Interpretation of Computer Programs",
            permitted_absences=2,
            enrollment_start=now_minus(30),
            section_start=now_minus(15),
            enrollment_end=now_plus(15),
            valid_until=now_plus(30),
            is_restricted=True,  # restricted course
        )
    else:
        cs61a = Course.objects.create(
            name="CS61A",
            title="Structure and Interpretation of Computer Programs",
            permitted_absences=2,
            enrollment_start=now_plus(16),
            section_start=now_plus(30),
            enrollment_end=now_plus(45),
            valid_until=now_plus(60),
            is_restricted=True,  # restricted course
        )
    mentor = Mentor.objects.create(user=mentor_user, course=cs61a)

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


def setup_unrelated_section_with_unrestricted(enrollment_open=True):
    """Set up an additional unrestricted course."""
    setup_unrelated_section(enrollment_open)

    cs70 = Course.objects.create(
        name="CS70",
        title="Discrete Mathematics and Probability Theory",
        permitted_absences=2,
        enrollment_start=now_minus(30),
        section_start=now_minus(15),
        enrollment_end=now_plus(15),
        valid_until=now_plus(30),
    )
    mentor_user = User.objects.create(
        username="unrestricted_mentor",
        first_name="Unrestricted",
        last_name="Mentor",
        email="unrestricted_mentor@berkeley.edu",
    )
    mentor = Mentor.objects.create(user=mentor_user, course=cs70)

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


def setup_whitelisted_section():
    """Whitelist `demo_user` for a course."""
    setup_unrelated_section()

    # whitelist user to the course
    cs61a = Course.objects.get(name="CS61A")
    user = User.objects.get(username="demo_user")
    cs61a.whitelist.add(user)


def setup_whitelisted_section_with_unrestricted():
    """
    Whitelist `demo_user` for a course, with the existence of an unrestricted course.
    """
    setup_unrelated_section_with_unrestricted()

    # whitelist user to the course
    cs61a = Course.objects.get(name="CS61A")
    user = User.objects.get(username="demo_user")
    cs61a.whitelist.add(user)


def setup_whitelisted_section_before_enrollment():
    """
    Whitelist `demo_user` for a course that has not opened enrollment yet.
    """
    setup_unrelated_section_with_unrestricted(enrollment_open=False)

    # whitelist user to the course
    cs61a = Course.objects.get(name="CS61A")
    user = User.objects.get(username="demo_user")
    cs61a.whitelist.add(user)
