import pytest
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
    return mentor_user, student_user, course, section


@pytest.mark.django_db
def test_update_word_of_the_day(
    client, setup_section
):
    mentor_user, student_user, course, section = setup_section

    sectionOccurrence = (SectionOccurrence(section=section, 
                                            date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ), 
                                            word_of_the_day = 'default'))
    sectionOccurrence.save()
    client.force_login(mentor_user)
    
    change_word_of_day_url = reverse("section-change-word-of-day", kwargs={"pk": sectionOccurrence.pk})
    client.put(change_word_of_day_url, data = {'word_of_the_day': 'changed'})

    assert sectionOccurrence.word_of_the_day == 'changed'

@pytest.mark.django_db
def test_update_word_of_the_day_failure(
    client, setup_section
):
    mentor_user, student_user, course, section = setup_section

    sectionOccurrence = (SectionOccurrence(section=section, 
                                            date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ), 
                                            word_of_the_day = 'default'))
    client.force_login(mentor_user)
    change_word_of_day_url = reverse("section-change-word-of-day", kwargs={"pk": sectionOccurrence.pk})
    client.put(change_word_of_day_url,data = {'word_of_the_day': ''})

    #Check to make sure that the word of the day does not change when provided an empty string
    assert sectionOccurrence.word_of_the_day == 'default'


@pytest.mark.django_db
def test_submit_attendance_failure(
    client, setup_section
):
    mentor, student_user, course, section = setup_section
    enroll_url = reverse("section-students", kwargs={"pk": section.pk})
    client.put(enroll_url)

    sectionOccurrence = (SectionOccurrence(section=section, 
                                            date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ), 
                                            word_of_the_day = 'test'))
    sectionOccurrence.save()
    client.force_login(student_user)
    submit_attendance_url = reverse("submit-attendance", kwargs={"pk": student_user.pk})
    client.put(submit_attendance_url, data={'attempt': 'wrong password', 'sectionOccurrence': sectionOccurrence.pk})

    # Still one attendance object
    assert Attendance.objects.all().count() == 1

    # Did not change the attendance.
    assert Attendance.objects.get(0).presence == ''

@pytest.mark.django_db
def test_submit_attendance_failure(
    client, setup_section
):
    mentor, student_user, course, section = setup_section
    enroll_url = reverse("section-students", kwargs={"pk": section.pk})
    client.put(enroll_url)

    sectionOccurrence = (SectionOccurrence(section=section, 
                                            date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ), 
                                            word_of_the_day = 'test'))
    client.force_login(student_user)
    submit_attendance_url = reverse("submit-attendance", kwargs={"pk": student_user.pk})
    client.put(submit_attendance_url, data={'attempt': 'test', 'sectionOccurrence': sectionOccurrence.pk})

    # Still one attendance object
    assert Attendance.objects.all().count() == 1

    # Did not change the attendance.
    assert Attendance.objects.get(0).presence == 'PR'



    #Check to make sure that another student can not change someone else's attendance.
    
    