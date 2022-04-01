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
    client.force_login(mentor_user)
    
    change_word_of_day_url = reverse("section-change-word-of-day", kwargs={"pk": sectionOccurrence.pk})
    client.put(change_word_of_day_url, {'word_of_the_day': 'changed'}, content_type='application/json')

    sectionOccurrence.refresh_from_db()
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

    client.force_login(mentor_user)
    change_word_of_day_url = reverse("section-change-word-of-day", kwargs={"pk": sectionOccurrence.pk})
    client.put(change_word_of_day_url, {'word_of_the_day': ''}, content_type='application/json')

    sectionOccurrence.refresh_from_db()
    #Check to make sure that the word of the day does not change when provided an empty string
    assert sectionOccurrence.word_of_the_day == 'default'


    #Check to make sure that a student can not change the word of the day for a sectionOccurrence

@pytest.mark.django_db
def test_submit_attendance_failure(
    client, setup_section
):
    mentor, student_user, course, section = setup_section
    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    sectionOccurrence = SectionOccurrence.objects.all().first()
    sectionOccurrence.word_of_the_day = 'password'
    sectionOccurrence.save()

    student = Student.objects.get(user=student_user)
    attendances = Attendance.objects.all().count()

    submit_attendance_url = reverse("student-submit-attendance", kwargs={"pk": student.pk})
    client.put(submit_attendance_url, {'attempt': 'wrong password', 'section_occurrence': sectionOccurrence.pk}, content_type='application/json')


    Attendance.objects.filter(sectionOccurrence=sectionOccurrence).first().refresh_from_db()
    
    # Still same num of attendance objects 
    assert Attendance.objects.all().count() == attendances

    # Did not change the attendance
    attendance = Attendance.objects.filter(sectionOccurrence=sectionOccurrence).first()
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


    student = Student.objects.get(user=student_user)

    attendances = Attendance.objects.all().count()
    attendance = Attendance.objects.filter(sectionOccurrence=sectionOccurrence).first()


    submit_attendance_url = reverse("student-submit-attendance", kwargs={"pk": student.pk})
    print(submit_attendance_url)
    client.put(submit_attendance_url, {'attempt': 'correct', 'sectionOccurrence': sectionOccurrence.pk}, content_type='application/json')

    # Still same num of attendance objects
    assert Attendance.objects.all().count() == attendances

    # Correctly changes the attendance
    attendance.refresh_from_db()
    assert attendance.presence == 'PR'

    # Does not affect other attendances 
    Attendance.objects.exclude(sectionOccurrence=sectionOccurrence).first().refresh_from_db()
    assert Attendance.objects.exclude(sectionOccurrence=sectionOccurrence).first().presence == ''

    #Check to make sure that another student can not change someone else's attendance.
    
    