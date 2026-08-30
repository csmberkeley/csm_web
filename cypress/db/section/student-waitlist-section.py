import datetime

from django.core.management import call_command
from django.utils import timezone
from scheduler.models import (
    Course,
    Mentor,
    Section,
    Spacetime,
    Student,
    User,
    WaitlistedStudent,
)

NOW = timezone.now().astimezone(timezone.get_default_timezone())


def now_minus(days: int):
    """Get date `days` prior to now"""
    return NOW - datetime.timedelta(days=days)


def now_plus(days: int):
    """Get date `days` after now"""
    return NOW + datetime.timedelta(days=days)


def setup_waitlisted_student():
    """Demo user is waitlisted for a section"""
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

    # create section at enrolled capacity
    section = Section.objects.create(
        mentor=mentor, capacity=3, description="test section"
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Monday",
        start_time="11:00:00",
        duration="01:00:00",
        location="Cory 400",
    )

    # fill section with enrolled students
    for prefix in ("A", "B", "C"):
        new_user = User.objects.create(
            username=f"{prefix}_student",
            first_name=prefix,
            last_name="Student",
            email=f"{prefix}_student@berkeley.edu",
        )
        Student.objects.create(user=new_user, course=cs61a, section=section)

    # add another waitlisted student before demo_user (so demo_user is #2)
    first_wl_user = User.objects.create(
        username="first_waitlist",
        first_name="First",
        last_name="Waitlisted",
        email="first_waitlist@berkeley.edu",
    )
    WaitlistedStudent.objects.create(user=first_wl_user, course=cs61a, section=section)

    # add demo_user as waitlisted student (position #2)
    WaitlistedStudent.objects.create(user=user, course=cs61a, section=section)
