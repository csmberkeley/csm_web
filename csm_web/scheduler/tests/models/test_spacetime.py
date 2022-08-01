import pytest
from freezegun import freeze_time
import datetime

from django.db.models import Q
from django.utils import timezone
from django.urls import reverse
from scheduler.models import (
    Override,
)
from scheduler.factories import (
    UserFactory,
    CourseFactory,
    SectionFactory,
    MentorFactory,
    CoordinatorFactory,
    SpacetimeFactory,
)

import zoneinfo

DEFAULT_TZ = zoneinfo.ZoneInfo(timezone.get_default_timezone().zone)


@pytest.fixture
def setup_section(db):
    mentor_user = UserFactory(
        username="mentor_user", first_name="mentor", last_name="user"
    )
    coord_user = UserFactory(
        username="coord_user", first_name="coord", last_name="user"
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
            2020, 5, 22, 0, 0, 0, tzinfo=DEFAULT_TZ  # friday
        ),
    )
    spacetimes = [
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
    ]
    coord = CoordinatorFactory(user=coord_user, course=course)
    mentor = MentorFactory(user=mentor_user, course=course)
    section = SectionFactory(
        mentor=mentor,
        capacity=6,
        spacetimes=spacetimes,
    )
    return section, mentor, coord, spacetimes


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["day", "spacetime_index"],
    [
        # delete tuesday day before section start
        (timezone.datetime(2020, 5, 21, 0, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete tuesday day before first tuesday
        (timezone.datetime(2020, 5, 25, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete tuesday on first tuesday before section
        (timezone.datetime(2020, 5, 26, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete tuesday on first tuesday after section
        (timezone.datetime(2020, 5, 26, 11, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete thursday day before first tuesday
        (timezone.datetime(2020, 5, 25, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday day before first thursday
        (timezone.datetime(2020, 5, 27, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday on first thursday before section
        (timezone.datetime(2020, 5, 28, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday on first thursday after section
        (timezone.datetime(2020, 5, 28, 11, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday two days before second tuesday
        (timezone.datetime(2020, 5, 31, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete tuesday day before third thursday
        (timezone.datetime(2020, 6, 10, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete thursday day before fourth thursday
        (timezone.datetime(2020, 6, 17, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday on fourth thursday before section
        (timezone.datetime(2020, 6, 18, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday on fourth thursday after section
        (timezone.datetime(2020, 6, 18, 11, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete tuesday day before last tuesday
        (timezone.datetime(2020, 6, 27, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete tuesday on last tuesday before section
        (timezone.datetime(2020, 6, 28, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete tuesday on last tuesday after section
        (timezone.datetime(2020, 6, 28, 11, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete tuesday day after last tuesday
        (timezone.datetime(2020, 6, 29, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # delete thursday day before last thursday
        (timezone.datetime(2020, 6, 29, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday on last thursday before section
        (timezone.datetime(2020, 6, 30, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete thursday on last thursday after section
        (timezone.datetime(2020, 6, 30, 11, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # delete tuesday on last thursday after section
        (timezone.datetime(2020, 6, 30, 11, 0, 0, tzinfo=DEFAULT_TZ), 0),
    ],
    ids=[
        "delete tuesday before section start",
        "delete tuesday day before first tuesday",
        "delete tuesday on first tuesday before section",
        "delete tuesday on first tuesday after section",
        "delete thursday day before first tuesday",
        "delete thursday day before first thursday",
        "delete thursday on first thursday before section",
        "delete thursday on first thursday after section",
        "delete thursday two days before second tuesday",
        "delete tuesday day before third thursday",
        "delete thursday day before fourth thursday",
        "delete thursday on fourth thursday before section",
        "delete thursday on fourth thursday after section",
        "delete tuesday day before last tuesday",
        "delete tuesday on last tuesday before section",
        "delete tuesday on last tuesday after section",
        "delete tuesday day after last tuesday",
        "delete thursday day before last thursday",
        "delete thursday on last thursday before section",
        "delete thursday on last thursday after section",
        "delete tuesday on last thursday after section",
    ],
)
def test_delete_spacetime(client, setup_section, day, spacetime_index):
    section, _, coord, spacetimes = setup_section

    with freeze_time(day):
        client.force_login(coord.user)
        spacetime = spacetimes[spacetime_index]
        delete_url = reverse("spacetime-detail", kwargs={"pk": spacetime.pk})
        client.delete(delete_url)

        # make sure spacetime has been deleted
        assert section.spacetimes.filter(pk=spacetime.pk).count() == 0

        # make sure future section occurrences have been deleted
        # FIX ME: Once issue #303 is resolved, this should search through the directly related section occurences
        assert section.sectionoccurrence_set.filter(
            date__gte=day, date__week_day=spacetime.day_number()
        ).count() == 0


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["day", "override_date", "spacetime_index"],
    [
        # on prior thursday, move tuesday section to following wednesday
        (timezone.datetime(2020, 5, 21, 0, 0, 0, tzinfo=DEFAULT_TZ),
         timezone.datetime(2020, 5, 27, 9, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # on prior monday, change tuesday section location
        (timezone.datetime(2020, 5, 25, 9, 0, 0, tzinfo=DEFAULT_TZ),
         timezone.datetime(2020, 5, 26, 10, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # on tuesday an hour before scheduled section, push tuesday section an hour later
        (timezone.datetime(2020, 5, 26, 9, 0, 0, tzinfo=DEFAULT_TZ),
         timezone.datetime(2020, 5, 26, 11, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # on tuesday an hour after scheduled section, correct tuesday section to prior monday
        (timezone.datetime(2020, 5, 26, 11, 0, 0, tzinfo=DEFAULT_TZ),
         timezone.datetime(2020, 5, 25, 10, 0, 0, tzinfo=DEFAULT_TZ), 0),
        # on prior monday, move thursday section to prior wednesday
        (timezone.datetime(2020, 5, 25, 9, 0, 0, tzinfo=DEFAULT_TZ),
         timezone.datetime(2020, 5, 27, 10, 0, 0, tzinfo=DEFAULT_TZ), 1),
        # on prior wednesday, move thursday section to current time
        (timezone.datetime(2020, 5, 27, 9, 0, 0, tzinfo=DEFAULT_TZ),
         timezone.datetime(2020, 5, 27, 9, 0, 0, tzinfo=DEFAULT_TZ), 1),
    ],
    ids=[
        "on prior thursday, move tuesday section to following wednesday",
        "on prior monday, change tuesday section location",
        "on tuesday an hour before scheduled section, push tuesday section an hour later",
        "on tuesday an hour after scheduled section, correct tuesday section to prior monday",
        "on prior monday, move thursday section to prior wednesday",
        "on prior wednesday, move thursday section to current time",
    ],
)
def test_delete_override(client, setup_section, day, override_date, spacetime_index):
    _, mentor, coord, spacetimes = setup_section

    with freeze_time(day):
        client.force_login(coord.user)
        spacetime = spacetimes[spacetime_index]
        override_url = reverse("spacetime-override", kwargs={"pk": spacetime.pk})

        response = client.put(override_url, content_type="application/json", data={
            "location": "location",
            "start_time": override_date.timetz(),
            "date": override_date.date(),
        })

        # refresh spacetime object
        spacetime.refresh_from_db()

        # make sure override has been created
        assert hasattr(spacetime, "_override")

    with freeze_time(day):
        client.force_login(mentor.user)

        client.delete(override_url)

        # refresh spacetime object
        spacetime.refresh_from_db()

        # make sure override has been deleted
        assert not hasattr(spacetime, "_override")
