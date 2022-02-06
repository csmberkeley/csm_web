import pytest
from freezegun import freeze_time
from unittest import mock
import factory
import faker
import datetime

from django.utils import timezone
from django.urls import reverse
from scheduler.models import (
    User,
    Course,
    Section,
    Mentor,
    Student,
    Attendance,
    SectionOccurrence,
)
from scheduler.factories import (
    UserFactory,
    CourseFactory,
    SectionFactory,
    MentorFactory,
    StudentFactory,
    AttendanceFactory,
    SpacetimeFactory,
)


@pytest.mark.django_db
def test_attendance_add_student_to_section(client):
    with freeze_time(
        timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=timezone.utc)  # monday
    ):
        mentor_user = UserFactory(username="mentor_user")
        student_user = UserFactory(username="student_user")
        course = CourseFactory(
            name="course",
            title="title for course",
            enrollment_start=datetime.datetime(
                2020, 5, 15, 0, 0, 0, tzinfo=timezone.utc  # friday
            ),
            enrollment_end=datetime.datetime(
                2020, 6, 15, 0, 0, 0, tzinfo=timezone.utc  # monday
            ),
            valid_until=datetime.datetime(
                2020, 7, 1, 0, 0, 0, tzinfo=timezone.utc  # wednesday
            ),
            section_start=datetime.datetime(
                2020, 5, 22, 0, 0, 0, tzinfo=timezone.utc  # monday
            ),
        )
        mentor = MentorFactory(user=mentor_user, course=course)
        section = SectionFactory(
            mentor=mentor,
            capacity=6,
            spacetimes=[
                SpacetimeFactory.create(
                    location="Cory 400",
                    start_time=datetime.time(hour=10, minute=0, tzinfo=timezone.utc),
                    duration=datetime.timedelta(hours=1),
                    day_of_week="Tuesday",
                ),
                SpacetimeFactory.create(
                    location="Cory 400",
                    start_time=datetime.time(hour=10, minute=0, tzinfo=timezone.utc),
                    duration=datetime.timedelta(hours=1),
                    day_of_week="Thursday",
                ),
            ],
        )

        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

        student = Student.objects.get(user=student_user)

        # make sure section occurrence objects have been created
        assert SectionOccurrence.objects.filter(section=section).count() == 2
        assert section.sectionoccurrence_set.count() == 2

        # make sure student attendances have been created as well
        assert Attendance.objects.filter(student=student).count() == 2
        assert student.attendance_set.count() == 2
        attendances = student.attendance_set.all()
        assert attendances[0].section == section
        assert attendances[1].section == section

        # make sure student is enrolled in section
        assert student.section == section
        assert section.students.count() == 1
