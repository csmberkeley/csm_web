import datetime

from django.core.management import call_command
from django.utils import timezone
from scheduler.models import Course, Mentor, Section, Spacetime, User

MINUS_15 = timezone.now() - datetime.timedelta(days=15)
MINUS_10 = timezone.now() - datetime.timedelta(days=10)
PLUS_10 = timezone.now() + datetime.timedelta(days=10)
PLUS_15 = timezone.now() + datetime.timedelta(days=15)
PLUS_20 = timezone.now() + datetime.timedelta(days=20)
PLUS_25 = timezone.now() + datetime.timedelta(days=25)
# reserved for priority enrollment
MINUS_5 = timezone.now() - datetime.timedelta(days=5)
PLUS_5 = timezone.now() + datetime.timedelta(days=5)


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
        enrollment_start=PLUS_10,
        section_start=PLUS_15,
        enrollment_end=PLUS_20,
        valid_until=PLUS_25,
    )
    # start < NOW < end
    Course.objects.create(
        name="CS61B",
        title="Data Structures",
        enrollment_start=MINUS_15,
        section_start=MINUS_10,
        # NOW
        enrollment_end=PLUS_10,
        valid_until=PLUS_15,
        permitted_absences=2,
    )
    # start < end < NOW
    Course.objects.create(
        name="CS61C",
        title="Machine Structures",
        permitted_absences=2,
        enrollment_start=MINUS_15,
        section_start=MINUS_10,
        enrollment_end=MINUS_10,
        # NOW
        valid_until=PLUS_15,
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
    user.priority_enrollment = MINUS_5
    user.save()


def setup_priority_enrollment_future():
    """
    Set up user wtih future priority enrollment time.
    """
    setup()
    user = User.objects.get(username="demo_user")
    user.priority_enrollment = PLUS_5
    user.save()
