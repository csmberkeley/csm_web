import datetime

from django.core.management import call_command
from django.utils import timezone
from scheduler.factories import StudentFactory
from scheduler.models import Coordinator, Course, Mentor, Section, Spacetime, User

MINUS_5 = timezone.now() - datetime.timedelta(days=5)
MINUS_3 = timezone.now() - datetime.timedelta(days=3)
MINUS_1 = timezone.now() - datetime.timedelta(days=1)
PLUS_3 = timezone.now() + datetime.timedelta(days=3)
PLUS_5 = timezone.now() + datetime.timedelta(days=5)
PLUS_10 = timezone.now() + datetime.timedelta(days=10)
PLUS_15 = timezone.now() + datetime.timedelta(days=15)
PLUS_30 = timezone.now() + datetime.timedelta(days=30)


def _setup(cs61a):
    # create mentors
    for i in range(1, 7):
        mentor_user = User.objects.create(
            username=f"test_mentor_{i}",
            email=f"test_mentor_{i}@berkeley.edu",
            first_name="Test",
            last_name=f"Mentor {i}",
        )
        Mentor.objects.create(user=mentor_user, course=cs61a)

    # Monday sections

    section = Section.objects.create(
        mentor=Mentor.objects.get(user__username="test_mentor_1"),
        capacity=5,
        description="Affinity section",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Monday",
        start_time="11:00:00",
        duration="01:00:00",
        location="Cory 400",
    )
    # students in section
    StudentFactory.create_batch(3, course=cs61a, section=section)

    section = Section.objects.create(
        mentor=Mentor.objects.get(user__username="test_mentor_2"),
        capacity=3,
        description="",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Monday",
        start_time="12:00:00",
        duration="01:30:00",
        location="Cory 300",
    )
    StudentFactory.create_batch(3, course=cs61a, section=section)

    section = Section.objects.create(
        mentor=Mentor.objects.get(user__username="test_mentor_3"),
        capacity=4,
        description="description",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Monday",
        start_time="16:00:00",
        duration="01:00:00",
        location="Soda 380",
    )

    # Tuesday/Wednesday sections

    section = Section.objects.create(
        mentor=Mentor.objects.get(user__username="test_mentor_4"),
        capacity=3,
        description="Online",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Tuesday",
        start_time="16:00:00",
        duration="01:00:00",
        location="Cory 212",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Wednesday",
        start_time="16:00:00",
        duration="01:00:00",
        location="Cory 400",
    )

    section = Section.objects.create(
        mentor=Mentor.objects.get(user__username="test_mentor_5"),
        capacity=4,
        description="Online",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Tuesday",
        start_time="11:00:00",
        duration="01:30:00",
        location="Cory 212",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Wednesday",
        start_time="12:00:00",
        duration="01:00:00",
        location="Soda 286",
    )
    StudentFactory.create_batch(4, course=cs61a, section=section)

    # Thursday sections

    section = Section.objects.create(
        mentor=Mentor.objects.get(user__username="test_mentor_6"),
        capacity=3,
        description="",
    )
    Spacetime.objects.create(
        section=section,
        day_of_week="Thursday",
        start_time="13:00:00",
        duration="01:00:00",
        location="Soda 300",
    )
    StudentFactory.create_batch(3, course=cs61a, section=section)


def _setup_user():
    call_command("createtestuser", silent=True)


def _setup_course_open():
    return Course.objects.create(
        name="CS61A",
        title="Structure and Interpretation of Computer Programs",
        permitted_absences=2,
        enrollment_start=MINUS_5,
        section_start=MINUS_1,
        enrollment_end=PLUS_15,
        valid_until=PLUS_30,
    )


def _setup_course_closed():
    return Course.objects.create(
        name="CS61A",
        title="Structure and Interpretation of Computer Programs",
        permitted_absences=2,
        enrollment_start=PLUS_5,
        section_start=PLUS_10,
        enrollment_end=PLUS_15,
        valid_until=PLUS_30,
    )


# Coordinator setup functions


def coord_setup_open():
    """
    Coordinator in open course; no priority enrollment
    """
    _setup_user()
    cs61a = _setup_course_open()

    # set demo_user as coordinator
    Coordinator.objects.create(
        user=User.objects.get(username="demo_user"), course=cs61a
    )
    _setup(cs61a)


def coord_setup_closed():
    """
    Coordinator in closed course; no priority enrollment
    """
    _setup_user()
    cs61a = _setup_course_closed()

    # set demo_user as coordinator
    Coordinator.objects.create(
        user=User.objects.get(username="demo_user"), course=cs61a
    )
    _setup(cs61a)


def coord_setup_closed_priority():
    """
    Coordinator in closed course, even with priority enrollment
    """
    coord_setup_closed()

    demo_user = User.objects.get(username="demo_user")
    demo_user.priority_enrollment = PLUS_3
    demo_user.save()


# Student setup functions


def student_setup_open():
    """
    Open course; no priority enrollment
    """
    _setup_user()
    cs61a = _setup_course_open()
    _setup(cs61a)


def student_setup_closed():
    """
    Closed course; no priority enrollment
    """
    _setup_user()
    cs61a = _setup_course_closed()
    _setup(cs61a)


def student_setup_open_priority():
    """
    Open course because prior priority enrollment;
    otherwise the course should be closed
    """
    student_setup_closed()

    demo_user = User.objects.get(username="demo_user")
    demo_user.priority_enrollment = MINUS_3
    demo_user.save()


def student_setup_closed_priority():
    """
    Closed course, even with priority enrollment
    """
    student_setup_closed()

    demo_user = User.objects.get(username="demo_user")
    demo_user.priority_enrollment = PLUS_3
    demo_user.save()
