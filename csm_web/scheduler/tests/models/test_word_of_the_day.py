import pytest
from unittest import mock
import factory
import faker
import datetime
from freezegun import freeze_time

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
    assert sectionOccurrence.word_of_the_day == 'default'

    client.force_login(mentor_user)
    
    # Change word of the day
    change_word_of_day_url = reverse("submit", kwargs={"section_occurrence_pk": sectionOccurrence.pk})
    client.put(change_word_of_day_url, {'word_of_the_day': 'changed'}, content_type='application/json')

    sectionOccurrence.refresh_from_db()

    # Word of the day is changed for the section occurrence
    assert sectionOccurrence.word_of_the_day == 'changed'

@pytest.mark.django_db
def test_update_word_of_the_day_failure(
    client, setup_section
):
    mentor_user, student_user, course, section = setup_section

    sectionOccurrence = (SectionOccurrence(section=section, 
                                            date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ), 
                                            word_of_the_day = 'default'))
    sectionOccurrence.save()
    assert sectionOccurrence.word_of_the_day == 'default'

    # Mentor attempts to submit empty string word of the day.
    client.force_login(mentor_user)
    change_word_of_day_url = reverse("submit", kwargs={"section_occurrence_pk": sectionOccurrence.pk})
    client.put(change_word_of_day_url, {'word_of_the_day': ''}, content_type='application/json')

    sectionOccurrence.refresh_from_db()

    # Word of the day unchanged
    assert sectionOccurrence.word_of_the_day == 'default'

    # Check to make sure that a student can not change the word of the day for a sectionOccurrence
    client.force_login(student_user)
    change_word_of_day_url = reverse("submit", kwargs={"section_occurrence_pk": sectionOccurrence.pk})
    client.put(change_word_of_day_url, {'word_of_the_day': 'invalid'}, content_type='application/json')

    sectionOccurrence.refresh_from_db()

    # Word of the day unchanged
    assert sectionOccurrence.word_of_the_day == 'default'


@pytest.mark.django_db
def test_submit_attendance_failure(
    client, setup_section
):
    mentor, student_user, course, section = setup_section
    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    # Set word of the day to password
    sectionOccurrence = SectionOccurrence.objects.all().first()
    sectionOccurrence.word_of_the_day = 'password'
    sectionOccurrence.save()
    assert sectionOccurrence.word_of_the_day == 'password'

    student = Student.objects.get(user=student_user)
    attendances = Attendance.objects.all().count()

    # Student submits incorrect word of the day
    submit_attendance_url = reverse("submit", kwargs={"section_occurrence_pk": sectionOccurrence.pk})
    response = client.put(submit_attendance_url, {'attempt': 'wrong password'}, content_type='application/json')
    Attendance.objects.filter(sectionOccurrence=sectionOccurrence).first().refresh_from_db()
    
    # Still same num of attendance objects 
    assert Attendance.objects.all().count() == attendances

    # Did not change the attendance
    attendance = Attendance.objects.filter(sectionOccurrence=sectionOccurrence).first()
    attendance.refresh_from_db()
    assert attendance.presence == ''


    # Can not change attendance outside of next day after section at midnight.
    client.force_login(student_user)
    with freeze_time(datetime.datetime.combine(sectionOccurrence.date, datetime.datetime.min.time() ,tzinfo=DEFAULT_TZ) + datetime.timedelta(days=1, seconds=1)):
        client.put(submit_attendance_url, {'attempt': 'password'}, content_type='application/json')
    attendance.refresh_from_db()
    assert attendance.presence == ''
    

    #Check to make sure that another student can not change someone else's attendance.
    student_user2 = UserFactory(
        username="student_user2", first_name="student", last_name="user"
    )
    mentor_user2 = UserFactory(
        username="mentor_user2", first_name="mentor", last_name="user"
    )
    mentor2 = MentorFactory(user=mentor_user2, course=course)
    section2 = SectionFactory(
        mentor=mentor2,
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
    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user2)
        enroll_url = reverse("section-students", kwargs={"pk": section2.pk})
        client.put(enroll_url)
    client.force_login(student_user2)

    # Other student user attempts to change attendance for original student user
    submit_attendance_url = reverse("submit", kwargs={"section_occurrence_pk": sectionOccurrence.pk})
    with freeze_time(sectionOccurrence.date):
        client.put(submit_attendance_url, {'attempt': 'password'}, content_type='application/json')
    attendance.refresh_from_db()

    # Attendance does not change.
    assert attendance.presence == ''
    




@pytest.mark.django_db
def test_submit_attendance_success(
    client, setup_section
):
    mentor, student_user, course, section = setup_section
    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    client.force_login(student_user)
    sectionOccurrence = SectionOccurrence.objects.all().first()
    sectionOccurrence.word_of_the_day = 'correct'
    sectionOccurrence.save()


    attendances = Attendance.objects.all().count()
    attendance = Attendance.objects.filter(sectionOccurrence=sectionOccurrence).first()


    submit_attendance_url = reverse("submit", kwargs={"section_occurrence_pk": sectionOccurrence.pk})

    # Can only change attendance within 24 hours after section.
    latest_time = sectionOccurrence.date + datetime.timedelta(days=1)
    with freeze_time(latest_time):
        client.put(submit_attendance_url, {'attempt': 'correct'}, content_type='application/json')

    # Still same num of attendance objects
    assert Attendance.objects.all().count() == attendances

    # Correctly changes the attendance
    attendance.refresh_from_db()
    assert attendance.presence == 'PR'

    # Does not affect other attendances 
    Attendance.objects.exclude(sectionOccurrence=sectionOccurrence).first().refresh_from_db()
    assert Attendance.objects.exclude(sectionOccurrence=sectionOccurrence).first().presence == ''


    


    
    