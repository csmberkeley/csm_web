import datetime

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
    # set up mentor user
    mentor_user = User.objects.create(
        username="demo_mentor",
        email="demo_mentor@berkeley.edu",
        first_name="Demo",
        last_name="Mentor",
    )
    mentor_user.is_staff = True
    mentor_user.is_superuser = True
    mentor_user.set_password("pass")
    mentor_user.save()

    # set up student user
    student_user = User.objects.create(
        username="demo_student",
        email="demo_student@berkeley.edu",
        first_name="Demo",
        last_name="Student",
    )
    student_user.is_staff = True
    student_user.is_superuser = True
    student_user.set_password("pass")
    student_user.save()

    # create cours
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
    student = Student.objects.create(user=student_user, course=cs61a, section=section)

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


def setup_section():
    """
    Setup both mentor and student users, both associated with the same section
    """
    _setup_common()
