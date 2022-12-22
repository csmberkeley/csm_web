import datetime
from typing import Literal, Union

from django.core.management import call_command
from django.utils import timezone
from scheduler.factories import MentorFactory, StudentFactory, UserFactory
from scheduler.models import (
    Attendance,
    Coordinator,
    Course,
    Mentor,
    Section,
    SectionOccurrence,
    Spacetime,
    Student,
    User,
)

NOW = timezone.now()


def NOW_MINUS(days: int):
    return timezone.now() - datetime.timedelta(days=days)


def NOW_PLUS(days: int):
    return timezone.now() + datetime.timedelta(days=days)


def _setup_common(role: Union[Literal["mentor"], Literal["coordinator"]]):
    call_command("createtestuser", silent=True)

    user = User.objects.get(username="demo_user")
    cs61a = Course.objects.create(
        name="CS61A",
        title="Structure and Interpretation of Computer Programs",
        permitted_absences=2,
        enrollment_start=NOW_MINUS(30),
        section_start=NOW_MINUS(15),
        enrollment_end=NOW_PLUS(15),
        valid_until=NOW_PLUS(30),
    )

    if role == "mentor":
        # create mentor
        mentor = Mentor.objects.create(user=user, course=cs61a)
    elif role == "coordinator":
        # create coordinator
        Coordinator.objects.create(user=user, course=cs61a)
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

    # create students (out of order on purpose)
    for prefix in ("A", "D", "C", "B"):
        new_user = User.objects.create(
            username=f"{prefix}_student",
            first_name=prefix,
            last_name="Student",
            email=f"{prefix}_student@berkeley.edu",
        )
        Student.objects.create(user=new_user, course=cs61a, section=section)

    # create additional users (1 through 5)
    for i in range(1, 6):
        User.objects.create(
            username=f"testuser{i}",
            first_name="Test",
            last_name=f"User {i}",
            email=f"testuser{i}@berkeley.edu",
        )


def setup_mentor_section():
    _setup_common(role="mentor")

    user = User.objects.get(username="demo_user")
    section = Section.objects.get(mentor__user=user)
    students = section.students.all()

    # remove automatic attendances
    SectionOccurrence.objects.filter(section=section).delete()

    # replace with fixed section occurrences and attendances
    so_now = SectionOccurrence.objects.create(section=section, date=NOW.date())
    so_tomorrow = SectionOccurrence.objects.create(
        section=section, date=NOW_PLUS(1).date()
    )

    # create attendances for each student
    for student in students:
        # everybody present for today
        Attendance.objects.create(
            presence="PR", student=student, sectionOccurrence=so_now
        )
        # blank for tomorrow
        Attendance.objects.create(
            student=student, sectionOccurrence=so_tomorrow)


def setup_multiple_mentor_sections():
    _setup_common(role="coordinator")

    cs61a = Course.objects.get(name="CS61A")

    # set up another mentor with a section
    user_1 = User.objects.create(
        username="user1", email="user1@berkeley.edu", first_name="User", last_name="One"
    )
    mentor_1 = Mentor.objects.create(user=user_1, course=cs61a)
    section_1 = Section.objects.create(mentor=mentor_1, capacity=5)
    Spacetime.objects.create(
        section=section_1,
        day_of_week="Wednesday",
        start_time="11:00:00",
        duration="01:00:00",
        location="Cory 400",
    )
    Spacetime.objects.create(
        section=section_1,
        day_of_week="Thursday",
        start_time="14:00:00",
        duration="01:00:00",
        location="Soda 380",
    )

    # set up new student in the section
    user_2 = User.objects.create(
        username="user2", email="user2@berkeley.edu", first_name="User", last_name="Two"
    )
    Student.objects.create(user=user_2, course=cs61a, section=section_1)

    # set up banned student in the section
    banned_user = User.objects.create(
        username="banned_student",
        email="banned_student@berkeley.edu",
        first_name="banned",
        last_name="student",
    )
    Student.objects.create(
        user=banned_user, course=cs61a, section=section_1, active=False, banned=True
    )


def setup_full_section():
    setup_multiple_mentor_sections()
    cs61a = Course.objects.get(name="CS61A")
    section = Section.objects.get(mentor__user__username="testmentor")
    user = User.objects.create(
        username="E_student",
        email="E_student@berkeley.edu",
        first_name="E",
        last_name="student",
    )
    Student.objects.create(user=user, course=cs61a, section=section)
