import pytest
import datetime
import zoneinfo

from scheduler.models import Spacetime

from rest_framework import status

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

DEFAULT_TZ = zoneinfo.ZoneInfo(timezone.get_default_timezone().zone)


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
def test_create_spacetime(client, setup_section):
    mentor, student_user, course, section = setup_section
    client.force_login(mentor.user)
    data = {'location': 'Main Stacks C1', 'start_time': datetime.time(hour=9, minute=0, tzinfo=DEFAULT_TZ), 'day_of_week': 'Monday', 'section': section.pk}
    create_spacetime_url = reverse("spacetime-list")
    client.post(create_spacetime_url, data=data,content_type="application/json")

    assert Spacetime.objects.count() == 3
    new_spacetime = Spacetime.objects.get(location='Main Stacks C1')
    assert new_spacetime.start_time == datetime.time(hour=9, minute=0, tzinfo=DEFAULT_TZ)
    assert new_spacetime.day_of_week == 'Monday'
    assert new_spacetime.section.pk == section.pk


    