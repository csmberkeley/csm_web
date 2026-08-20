"""Simple tests for gcal.py. No database, credentials, or network.

Models are faked with SimpleNamespace, and the Google client is swapped for a
fake that records what it was called with.
"""

import datetime
from types import SimpleNamespace

from scheduler.notifications import gcal


class FakeStudents:
    """Just enough queryset for .filter(active=True).exclude(user__email="")."""

    def __init__(self, students):
        self.students = list(students)

    def filter(self, active):
        return FakeStudents(s for s in self.students if s.active == active)

    def exclude(self, user__email):
        return FakeStudents(s for s in self.students if s.user.email != user__email)

    def __iter__(self):
        return iter(self.students)


def make_student(email, active=True):
    return SimpleNamespace(active=active, user=SimpleNamespace(email=email))


def make_section(students=()):
    """A section meeting Tuesdays 10:00-11:30 in Gateway, mentored by Ada."""
    course = SimpleNamespace(
        name="CSM61A",
        section_start=datetime.date(2026, 8, 26),  # a Wednesday
        valid_until=datetime.date(2026, 12, 18),
    )
    mentor = SimpleNamespace(
        name="Ada", user=SimpleNamespace(email="ada@berkeley.edu"), course=course
    )
    spacetime = SimpleNamespace(
        day_of_week="Tuesday",
        start_time=datetime.time(10, 0),
        end_time=datetime.time(11, 30),
        location="Gateway",
    )
    return SimpleNamespace(
        mentor=mentor,
        spacetimes=SimpleNamespace(first=lambda: spacetime),
        students=FakeStudents(students),
    )


# --- _first_occurrence: "Tuesdays" plus a start date -> a real date ---


def test_first_occurrence_same_day():
    # 2026-08-26 is itself a Wednesday.
    assert gcal._first_occurrence(
        datetime.date(2026, 8, 26), "Wednesday"
    ) == datetime.date(2026, 8, 26)


def test_first_occurrence_later_in_the_same_week():
    assert gcal._first_occurrence(
        datetime.date(2026, 8, 26), "Friday"
    ) == datetime.date(2026, 8, 28)


def test_first_occurrence_wraps_into_next_week():
    assert gcal._first_occurrence(
        datetime.date(2026, 8, 26), "Tuesday"
    ) == datetime.date(2026, 9, 1)


# --- _build_attendees ---


def test_build_attendees_has_mentor_and_students():
    section = make_section([make_student("bob@berkeley.edu")])

    assert gcal._build_attendees(section) == [
        {"email": "ada@berkeley.edu"},
        {"email": "bob@berkeley.edu"},
    ]


def test_build_attendees_skips_dropped_students():
    section = make_section([make_student("gone@berkeley.edu", active=False)])

    assert gcal._build_attendees(section) == [{"email": "ada@berkeley.edu"}]


def test_build_attendees_skips_blank_emails():
    section = make_section([make_student("")])

    assert gcal._build_attendees(section) == [{"email": "ada@berkeley.edu"}]


# --- _build_event_body ---


def test_build_event_body_fields():
    body = gcal._build_event_body(make_section())

    assert body["summary"] == "CSM61A Section — Ada"
    assert body["location"] == "Gateway"
    # First Tuesday on or after Wednesday 2026-08-26.
    assert body["start"]["dateTime"] == "2026-09-01T10:00:00"
    assert body["end"]["dateTime"] == "2026-09-01T11:30:00"
    assert body["recurrence"] == ["RRULE:FREQ=WEEKLY;UNTIL=20261218T235959Z"]


def test_build_event_body_keeps_the_roster_private():
    body = gcal._build_event_body(make_section([make_student("bob@berkeley.edu")]))

    assert body["guestsCanModify"] is False
    assert body["guestsCanInviteOthers"] is False
    # Google defaults this to True, which would show every student the roster.
    assert body["guestsCanSeeOtherGuests"] is False


# --- the client, against a fake Google ---


class FakeEvents:
    def __init__(self, calls):
        self.calls = calls

    def insert(self, **kwargs):
        self.calls.append(("insert", kwargs))
        return SimpleNamespace(execute=lambda: {"id": "new-event-id"})

    def patch(self, **kwargs):
        self.calls.append(("patch", kwargs))
        return SimpleNamespace(execute=lambda: {"id": kwargs["eventId"]})


class FakeService:
    def __init__(self, calls):
        self._events = FakeEvents(calls)

    def events(self):
        return self._events


def fake_client(monkeypatch):
    """A GoogleCalendarClient that records calls instead of reaching Google."""
    calls = []
    monkeypatch.setattr(gcal, "get_google_credentials", lambda: object())
    monkeypatch.setattr(gcal, "build", lambda *_a, **_k: FakeService(calls))
    return gcal.GoogleCalendarClient(), calls


def test_create_event_passes_body_and_params(monkeypatch):
    client, calls = fake_client(monkeypatch)

    result = client.create_event("cal-id", {"summary": "Test"}, sendUpdates="all")

    assert result == {"id": "new-event-id"}
    _method, kwargs = calls[0]
    assert kwargs["calendarId"] == "cal-id"
    assert kwargs["body"] == {"summary": "Test"}
    assert kwargs["sendUpdates"] == "all"


def test_patch_event_sends_only_what_it_was_given(monkeypatch):
    client, calls = fake_client(monkeypatch)

    client.patch_event("cal-id", "event-id", {"location": "Soda 306"})

    _method, kwargs = calls[0]
    assert kwargs["eventId"] == "event-id"
    assert kwargs["body"] == {"location": "Soda 306"}
