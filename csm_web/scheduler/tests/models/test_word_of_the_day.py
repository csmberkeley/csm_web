import datetime
import zoneinfo

import pytest
from django.urls import reverse
from django.utils import timezone
from freezegun import freeze_time
from scheduler.factories import (
    CourseFactory,
    MentorFactory,
    SectionFactory,
    SpacetimeFactory,
    UserFactory,
)
from scheduler.models import Attendance, SectionOccurrence, Student

DEFAULT_TZ = zoneinfo.ZoneInfo(timezone.get_default_timezone().zone)


# avoid pylint warning redefining name in outer scope
@pytest.fixture(name="setup_section")
def fixture_setup_section(db):  # pylint: disable=unused-argument
    """
    Set up a mentor, student and section for word of the day testing.
    """
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
            2020, 5, 22, 0, 0, 0, tzinfo=DEFAULT_TZ  # Friday
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
@pytest.mark.parametrize(
    ["word", "expected_word"],
    [
        # exact matching word
        ("changed", "changed"),
        # matching word but with additional whitespace
        (" valid ", "valid"),
    ],
    ids=["exact word", "matching with whitespace"],
)
def test_update_wotd(client, setup_section, word, expected_word):
    """
    Check attendance updates correctly when given a matching word.
    """
    mentor_user, _student_user, _course, section = setup_section

    section_occurrence = SectionOccurrence(
        section=section,
        date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ),
        word_of_the_day="default",
    )
    section_occurrence.save()
    assert section_occurrence.word_of_the_day == "default"

    client.force_login(mentor_user)

    # Change word of the day
    change_word_of_day_url = reverse("section-wotd", kwargs={"pk": section.id})
    client.put(
        change_word_of_day_url,
        {"sectionOccurrenceId": section_occurrence.id, "wordOfTheDay": word},
        content_type="application/json",
    )

    section_occurrence.refresh_from_db()

    # Word of the day is changed for the section occurrence
    assert section_occurrence.word_of_the_day == expected_word


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["word"],
    [
        # empty string
        ("",),
        # contains whitespace
        ("invalid word",),
    ],
    ids=["empty string", "contains whitespace"],
)
def test_update_wotd_failure(client, setup_section, word):
    """
    Check attendance fails to update when given invalid word.
    """
    mentor_user, _student_user, _course, section = setup_section

    section_occurrence = SectionOccurrence(
        section=section,
        date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ),
        word_of_the_day="default",
    )
    section_occurrence.save()
    assert section_occurrence.word_of_the_day == "default"

    # Mentor attempts to submit empty string word of the day.
    client.force_login(mentor_user)
    change_word_of_day_url = reverse("section-wotd", kwargs={"pk": section.id})
    client.put(
        change_word_of_day_url,
        {"sectionOccurrenceId": section_occurrence.id, "wordOfTheDay": word},
        content_type="application/json",
    )

    section_occurrence.refresh_from_db()

    # Word of the day unchanged
    assert section_occurrence.word_of_the_day == "default"


@pytest.mark.django_db
def test_student_update_wotd_failure(client, setup_section):
    """
    Check that a student cannot change the word of the day.
    """
    _mentor_user, student_user, _course, section = setup_section

    section_occurrence = SectionOccurrence(
        section=section,
        date=datetime.datetime(2020, 1, 1, tzinfo=DEFAULT_TZ),
        word_of_the_day="default",
    )
    section_occurrence.save()
    assert section_occurrence.word_of_the_day == "default"

    client.force_login(student_user)
    change_word_of_day_url = reverse("section-wotd", kwargs={"pk": section.id})
    client.put(
        change_word_of_day_url,
        {"sectionOccurrenceId": section_occurrence.id, "wordOfTheDay": "invalid"},
        content_type="application/json",
    )

    section_occurrence.refresh_from_db()

    # Word of the day unchanged
    assert section_occurrence.word_of_the_day == "default"


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["word"],
    [
        # invalid word
        ("invalid",),
        # invalid word with whitespace
        ("invalid word",),
    ],
    ids=["invalid", "invalid with whitespace"],
)
def test_submit_attendance_failure(client, setup_section, word):
    """
    Check that submitting an invalid word fails to update attendance.
    """
    _mentor, student_user, _course, section = setup_section
    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    # Set word of the day
    section_occurrence = SectionOccurrence.objects.all().first()
    section_occurrence.word_of_the_day = "password"
    section_occurrence.save()
    assert section_occurrence.word_of_the_day == "password"

    student = Student.objects.get(user=student_user)
    attendances = Attendance.objects.all().count()
    attendance = section_occurrence.attendance_set.get(student=student)

    # Student submits incorrect word of the day
    submit_attendance_url = reverse("section-wotd", kwargs={"pk": section.id})
    client.put(
        submit_attendance_url,
        {
            "attendanceId": attendance.id,
            "wordOfTheDay": word,
        },
        content_type="application/json",
    )

    # Still same num of attendance objects
    assert Attendance.objects.all().count() == attendances

    # Did not change the attendance
    attendance = Attendance.objects.get(
        sectionOccurrence=section_occurrence, student=student
    )
    assert attendance.presence == ""


@pytest.mark.django_db
def test_submit_another_student_wotd_failure(client, setup_section):
    """
    Check that another student cannot change someone else's attendance.
    """
    _mentor, student_user, course, section = setup_section
    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    # set word of the day
    section_occurrence = SectionOccurrence.objects.all().first()
    section_occurrence.word_of_the_day = "password"
    section_occurrence.save()
    assert section_occurrence.word_of_the_day == "password"

    student = Student.objects.get(user=student_user)
    attendance = section_occurrence.attendance_set.get(student=student)

    # set up other student's section
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

    # other student user attempts to change attendance for original student user
    submit_attendance_url = reverse("section-wotd", kwargs={"pk": section.pk})
    with freeze_time(section_occurrence.date):
        client.put(
            submit_attendance_url,
            {"attendanceId": attendance.id, "wordOfTheDay": "password"},
            content_type="application/json",
        )
    attendance.refresh_from_db()

    # attendance should not change
    assert attendance.presence == ""


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["submission_limit", "submission_date", "expected_success"],
    # section time is (Tuesday) 6/9/2020 at 10:00 AM
    [
        (
            datetime.timedelta(days=1),
            # midnight on day of section (before section)
            datetime.datetime(2020, 6, 9, 0, 0, tzinfo=DEFAULT_TZ),
            True,
        ),
        (
            datetime.timedelta(days=1),
            # exactly when section starts
            datetime.datetime(2020, 6, 9, 10, 0, tzinfo=DEFAULT_TZ),
            True,
        ),
        (
            datetime.timedelta(days=1),
            # one day after section start
            datetime.datetime(2020, 6, 10, 10, 0, tzinfo=DEFAULT_TZ),
            True,
        ),
        (
            datetime.timedelta(days=1),
            # end of day after section
            datetime.datetime(2020, 6, 10, 11, 59, 59, tzinfo=DEFAULT_TZ),
            True,
        ),
        (
            datetime.timedelta(days=1),
            # midnight two days after section (no longer +1 day from section)
            datetime.datetime(2020, 6, 11, 0, 0, 0, tzinfo=DEFAULT_TZ),
            False,
        ),
        (
            datetime.timedelta(days=1),
            # some time after
            datetime.datetime(2020, 7, 1, 10, 0, tzinfo=DEFAULT_TZ),
            False,
        ),
        # no limit
        (
            None,
            # midnight two days after section (was bad before, should be fine now
            datetime.datetime(2020, 6, 11, 0, 0, 0, tzinfo=DEFAULT_TZ),
            True,
        ),
        (
            None,
            # should accept some time after
            datetime.datetime(2020, 7, 1, 0, 0),
            True,
        ),
    ],
)
def test_submit_attendance_dates(
    client, setup_section, submission_limit, submission_date, expected_success
):
    """
    Check that submitting a matching word of the day marks the student attendance as present.
    """
    _mentor, student_user, course, section = setup_section
    # set wotd limit for course
    course.word_of_the_day_limit = submission_limit
    course.save()

    with freeze_time(timezone.datetime(2020, 6, 8, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        # enroll on Monday 6/8/20, to create attendances for Tuesday 6/9 and Thursday 6/11
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    client.force_login(student_user)

    # get section on Tuesday 6/9/20
    section_occurrence = SectionOccurrence.objects.get(date="2020-06-09")
    # set word of the day
    section_occurrence.word_of_the_day = "correct"
    section_occurrence.save()

    attendances = Attendance.objects.all().count()
    attendance = Attendance.objects.get(
        student__user=student_user, sectionOccurrence=section_occurrence
    )

    submit_attendance_url = reverse("section-wotd", kwargs={"pk": section.id})

    # Can only change attendance within the time limit, and correctly strips whitespace.
    with freeze_time(submission_date):
        response = client.put(
            submit_attendance_url,
            {"attendanceId": attendance.id, "wordOfTheDay": " correct "},
            content_type="application/json",
        )

        if expected_success:
            # should have accepted request
            assert response.status_code == 200
        else:
            # should have denied request
            assert response.status_code == 403

    # Still same num of attendance objects
    assert Attendance.objects.all().count() == attendances

    attendance.refresh_from_db()
    if expected_success:
        # should have successfully changed attendance
        assert attendance.presence == "PR"

    # Does not affect other attendances
    other_attendances = Attendance.objects.exclude(
        sectionOccurrence__section=section, sectionOccurrence=section_occurrence
    )
    for other_attendance in other_attendances:
        assert other_attendance.presence == ""


@pytest.mark.django_db
def test_student_submit_wotd_for_previous_attendance_failure(client, setup_section):
    """
    Check that a student cannot overwrite a previously submitted attendance.
    """
    _mentor_user, student_user, _course, section = setup_section

    with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
        client.force_login(student_user)
        enroll_url = reverse("section-students", kwargs={"pk": section.pk})
        client.put(enroll_url)

    section_occurrence = SectionOccurrence.objects.all().first()
    section_occurrence.word_of_the_day = "correct"
    section_occurrence.save()

    # mark attendance
    attendance = Attendance.objects.get(
        student__user=student_user, sectionOccurrence=section_occurrence
    )
    attendance.presence = "UN"
    attendance.save()

    submit_attendance_url = reverse("section-wotd", kwargs={"pk": section.id})

    client.force_login(student_user)
    response = client.put(
        submit_attendance_url,
        {"attendanceId": attendance.id, "wordOfTheDay": "correct"},
        content_type="application/json",
    )
    # permission denied
    assert response.status_code == 403

    # attendance should be unchanged
    attendance.refresh_from_db()
    assert attendance.presence == "UN"
