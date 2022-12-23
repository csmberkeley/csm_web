import datetime

from django.core.management import call_command
from django.utils import timezone
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

NOW = timezone.now().astimezone(timezone.get_default_timezone())


def now_minus(days: int):
    """Get date `days` prior to now"""
    return NOW - datetime.timedelta(days=days)


def now_plus(days: int):
    """Get date `days` after now"""
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
    """Demo user as a coordinator for a section"""
    _setup_common()

    user = User.objects.get(username="testmentor")
    section = Section.objects.get(mentor__user=user)
    students = section.students.all()

    # remove automatic attendances
    SectionOccurrence.objects.filter(section=section).delete()

    # replace with fixed section occurrences and attendances
    so_now = SectionOccurrence.objects.create(section=section, date=NOW.date())
    so_tomorrow = SectionOccurrence.objects.create(
        section=section, date=now_plus(1).date()
    )

    # create attendances for each student
    for student in students:
        # everybody present for today
        Attendance.objects.create(
            presence="PR", student=student, sectionOccurrence=so_now
        )
        # blank for tomorrow
        Attendance.objects.create(student=student, sectionOccurrence=so_tomorrow)


def setup_multiple_mentor_sections():
    """Multiple mentor sections with demo user as coordinator"""
    _setup_common()

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
    """Multiple mentor sections, with target section being full"""
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
