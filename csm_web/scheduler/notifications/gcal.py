"""Google Calendar integration for section meetings.

Each course has its own calendar; each section becomes a recurring weekly event
on it. Uses the shared mentors@berkeley.edu credentials.

GoogleCalendarClient is the bare API wrapper -- one call per method, taking a
body the caller builds. The functions below it are the CSM-aware half: they turn
a Section into that body and own the database write that saves the event id.

Every method also takes **params for Calendar API request parameters -- most
importantly sendUpdates="all", which defaults to "none", meaning nobody is
emailed unless you pass it.
"""

import datetime

from googleapiclient.discovery import build

from scheduler.models import day_to_number
from scheduler.notifications.ops_notifications import get_google_credentials

CALENDAR_TIME_ZONE = "America/Los_Angeles"


class GoogleCalendarClient:
    """Wrapper for the Google Calendar API.

    Build one where you use it. A module-level instance would fetch an OAuth
    token at import time and break manage.py on machines without credentials.
    """

    def __init__(self):
        self.service = build("calendar", "v3", credentials=get_google_credentials())

    def create_calendar(self, course):
        """Create a calendar for the course, store its id, and return it."""
        calendar = self.service.calendars().insert(body={
            "summary": course.name,
            "description": course.title,
            "timeZone": CALENDAR_TIME_ZONE,
        }).execute()
        course.calendar_id = calendar["id"]
        course.save()
        return calendar["id"]

    def delete_calendar(self, calendar_id):
        """Delete a calendar by id."""
        self.service.calendars().delete(calendarId=calendar_id).execute()

    def create_event(self, calendar_id, body, **params):
        """Create an event on a calendar, return the created event."""
        return (
            self.service.events()
            .insert(calendarId=calendar_id, body=body, **params)
            .execute()
        )

    def update_event(self, calendar_id, event_id, body, **params):
        """Replace an event entirely; fields missing from body are cleared."""
        return (
            self.service.events()
            .update(calendarId=calendar_id, eventId=event_id, body=body, **params)
            .execute()
        )

    def patch_event(self, calendar_id, event_id, body, **params):
        """Update only the fields in body; a list field is replaced, not appended."""
        return (
            self.service.events()
            .patch(calendarId=calendar_id, eventId=event_id, body=body, **params)
            .execute()
        )

    def get_event(self, calendar_id, event_id, **params):
        """Fetch a single event."""
        return (
            self.service.events()
            .get(calendarId=calendar_id, eventId=event_id, **params)
            .execute()
        )

    def delete_event(self, calendar_id, event_id, **params):
        """Delete a single event."""
        self.service.events().delete(
            calendarId=calendar_id, eventId=event_id, **params
        ).execute()

    def list_events(self, calendar_id, **params):
        """List a calendar's events; first page only, no recurrence instances."""
        return (
            self.service.events()
            .list(calendarId=calendar_id, **params)
            .execute()
            .get("items", [])
        )

    def list_event_instances(self, calendar_id, event_id, **params):
        """List the individual weekly meetings of one recurring event."""
        return (
            self.service.events()
            .instances(calendarId=calendar_id, eventId=event_id, **params)
            .execute()
            .get("items", [])
        )


def _first_occurrence(section_start, day_of_week):
    """The first date on or after section_start falling on day_of_week."""
    days_ahead = (day_to_number(day_of_week) - section_start.weekday()) % 7
    return section_start + datetime.timedelta(days=days_ahead)


def _build_attendees(section):
    """The mentor and actively enrolled students, deduped and sorted."""
    emails = {section.mentor.user.email.lower()}
    for student in section.students.filter(active=True).exclude(user__email=""):
        emails.add(student.user.email.lower())
    return [{"email": email} for email in sorted(emails)]


def _build_event_body(section):
    """Map a Section onto a Calendar event body.

    Uses the section's first spacetime, so a section meeting twice a week only
    gets its first meeting on the calendar.
    """
    mentor = section.mentor
    course = mentor.course
    spacetime = section.spacetimes.first()

    # A spacetime has a weekday but no date, so pick the first matching date.
    start_date = _first_occurrence(course.section_start, spacetime.day_of_week)
    start = datetime.datetime.combine(start_date, spacetime.start_time)
    end = datetime.datetime.combine(start_date, spacetime.end_time)

    return {
        "summary": f"{course.name} Section — {mentor.name}",
        "description": f"CSM section led by {mentor.name}",
        "location": spacetime.location,
        "start": {"dateTime": start.isoformat(), "timeZone": CALENDAR_TIME_ZONE},
        "end": {"dateTime": end.isoformat(), "timeZone": CALENDAR_TIME_ZONE},
        "recurrence": [f"RRULE:FREQ=WEEKLY;UNTIL={course.valid_until:%Y%m%d}T235959Z"],
        "attendees": _build_attendees(section),
        # All three default in Google's favor; seeOtherGuests would show every
        # student the whole roster's email addresses.
        "guestsCanModify": False,
        "guestsCanInviteOthers": False,
        "guestsCanSeeOtherGuests": False,
    }


def create_section_event(section):
    """Create the section's calendar event and store its id."""
    course = section.mentor.course
    event = GoogleCalendarClient().create_event(
        course.calendar_id, _build_event_body(section), sendUpdates="all"
    )
    section.calendar_event_id = event["id"]
    section.save(update_fields=["calendar_event_id"])
    return event


def update_section_event(section):
    """Push the section's current details onto its existing event."""
    course = section.mentor.course
    return GoogleCalendarClient().patch_event(
        course.calendar_id,
        section.calendar_event_id,
        _build_event_body(section),
        sendUpdates="all",
    )


def sync_section_attendees(section):
    """Push the section's current roster onto its event.

    A patch replaces the attendee list rather than appending, so this always
    sends the complete roster.
    """
    course = section.mentor.course
    return GoogleCalendarClient().patch_event(
        course.calendar_id,
        section.calendar_event_id,
        {"attendees": _build_attendees(section)},
        sendUpdates="all",
    )
