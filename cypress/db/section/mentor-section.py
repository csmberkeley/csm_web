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

    # create mentor
    mentor = Mentor.objects.create(user=user, course=cs61a)

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
    """Demo user as a mentor for a section"""
    _setup_common()

    user = User.objects.get(username="demo_user")
    section = Section.objects.get(mentor__user=user)
    students = section.students.all()

    # remove automatic attendances
    SectionOccurrence.objects.filter(section=section).delete()

    # replace with fixed section occurrences and attendances
    so_yesterday = SectionOccurrence.objects.create(
        section=section, date=now_minus(1).date()
    )
    so_now = SectionOccurrence.objects.create(section=section, date=NOW.date())

    # create attendances for each student
    for student in students:
        # everybody present for yesterday
        Attendance.objects.create(
            presence="PR", student=student, sectionOccurrence=so_yesterday
        )
        # blank for today
        Attendance.objects.create(student=student, sectionOccurrence=so_now)
