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

import zoneinfo

DEFAULT_TZ = timezone.get_default_timezone()


@pytest.fixture
def setup_section(db):
    mentor_user = UserFactory(
        username="mentor_user", first_name="mentor", last_name="user"
    )
    student_user = UserFactory(
        username="student_user", first_name="student", last_name="user"
    )
    course = CourseFactory(
        name="course",
        title="title for course",
        enrollment_start=datetime.datetime(
            2020, 5, 15, 0, 0, 0, tzinfo=DEFAULT_TZ  # friday
        ),
        enrollment_end=datetime.datetime(
            2020, 6, 15, 0, 0, 0, tzinfo=DEFAULT_TZ  # monday
        ),
        valid_until=datetime.datetime(
            2020, 7, 1, 0, 0, 0, tzinfo=DEFAULT_TZ  # wednesday
        ),
        section_start=datetime.datetime(
            2020, 5, 22, 0, 0, 0, tzinfo=DEFAULT_TZ  # monday
        ),
    )
    mentor = MentorFactory(user=mentor_user, course=course)
    section = SectionFactory(
        mentor=mentor,
        capacity=6,
        spacetimes=[
            SpacetimeFactory.create(
                location="Cory 400",
                start_time=datetime.time(hour=10, minute=0, tzinfo=DEFAULT_TZ),
                duration=datetime.timedelta(hours=1),
                day_of_week="Tuesday",
            ),
            SpacetimeFactory.create(
                location="Cory 400",
                start_time=datetime.time(hour=10, minute=0, tzinfo=DEFAULT_TZ),
                duration=datetime.timedelta(hours=1),
                day_of_week="Thursday",
            ),
        ],
    )
    return mentor, student_user, course, section


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["day", "num_attendances_added"],
    [
        # monday
        (timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ), 2),
        # tuesday before section
        (timezone.datetime(2020, 6, 2, 9, 0, 0, tzinfo=DEFAULT_TZ), 2),
        # tuesday after section
        (timezone.datetime(2020, 6, 2, 11, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # wednesday
        (timezone.datetime(2020, 6, 3, 3, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # thursday before section
        (timezone.datetime(2020, 6, 4, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # thursday after section
        (timezone.datetime(2020, 6, 4, 11, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # friday
        (timezone.datetime(2020, 6, 5, 5, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # saturday
        (timezone.datetime(2020, 6, 6, 6, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # sunday
        (timezone.datetime(2020, 6, 7, 7, 0, 0, tzinfo=DEFAULT_TZ), 0),
    ],
    ids=[
        "monday",
        "tuesday before section",
        "tuesday after section",
        "wednesday",
        "thursday before section",
        "thursday after section",
        "friday",
        "saturday",
        "sunday",
    ],
)
def test_attendance_add_student_on_day(
    client, setup_section, day, num_attendances_added
):
    mentor, student_user, course, section = setup_section
    with freeze_time(day):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

        student = Student.objects.get(user=student_user)

        # make sure student is enrolled in section
        assert student.section == section
        assert section.students.count() == 1

        # make sure section occurrence objects have been created
        assert (
            SectionOccurrence.objects.filter(section=section).count()
            == num_attendances_added
        )
        assert section.sectionoccurrence_set.count() == num_attendances_added

        # make sure student attendances have been created as well
        assert (
            Attendance.objects.filter(student=student).count() == num_attendances_added
        )
        assert student.attendance_set.count() == num_attendances_added
        attendances = student.attendance_set.all()
        assert all(attendance.section == section for attendance in attendances)


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["day", "num_attendances_left"],
    [
        # monday
        (timezone.datetime(2020, 6, 1, 1, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # tuesday before section
        (timezone.datetime(2020, 6, 2, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # tuesday after section; still deleted
        (timezone.datetime(2020, 6, 2, 11, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # wednesday
        (timezone.datetime(2020, 6, 3, 3, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # thursday before section
        (timezone.datetime(2020, 6, 4, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # thursday after section; still deleted
        (timezone.datetime(2020, 6, 4, 11, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # friday
        (timezone.datetime(2020, 6, 5, 5, 0, 0, tzinfo=DEFAULT_TZ), 2),
        # saturday
        (timezone.datetime(2020, 6, 6, 6, 0, 0, tzinfo=DEFAULT_TZ), 2),
        # sunday
        (timezone.datetime(2020, 6, 7, 7, 0, 0, tzinfo=DEFAULT_TZ), 2),
    ],
    ids=[
        "monday",
        "tuesday before section",
        "tuesday after section",
        "wednesday",
        "thursday before section",
        "thursday after section",
        "friday",
        "saturday",
        "sunday",
    ],
)
def test_attendance_drop_student_on_day(
    client, setup_section, day, num_attendances_left
):
    mentor, student_user, course, section = setup_section

    # enroll student first
    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    # now drop the student
    with freeze_time(day):
        client.force_login(student_user)
        student = Student.objects.get(user=student_user)
        drop_url = reverse("student-drop", kwargs={"pk": student.pk})
        client.patch(drop_url)

        # refresh student object
        student.refresh_from_db()

        # make sure student is no longer enrolled in section
        assert student.active is False
        assert section.current_student_count == 0
        # student should still be associated with the section though
        assert section.students.count() == 1

        # make sure section occurrence objects are still there
        assert SectionOccurrence.objects.filter(section=section).count() == 2

        # make sure attendance objects have been deleted
        assert student.attendance_set.count() == num_attendances_left
