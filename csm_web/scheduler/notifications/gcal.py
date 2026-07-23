"""Google Calendar integration for section meetings.

Each course has its own calendar; each section becomes a recurring weekly event
on it. Reuses the shared mentors@berkeley.edu credentials from ops_notifications.
"""

from googleapiclient.discovery import build

from scheduler.notifications.ops_notifications import get_google_credentials

CALENDAR_TIME_ZONE = "America/Los_Angeles"


class GoogleCalendarClient:
    """Wrapper for the Google Calendar API."""

    def __init__(self):
        self.service = build("calendar", "v3", credentials=get_google_credentials())

    def ensure_course_calendar(self, course) -> str:
        """Get-or-create the course's calendar, share it, and return its id.

        Mentors get writer access, coordinators get reader access.
        """
        raise NotImplementedError

    def share_calendar(self, calendar_id: str, email: str, role: str) -> None:
        """Give an email address access to a calendar ("writer" or "reader")."""
        raise NotImplementedError

    def upsert_section_event(self, section) -> str:
        """Create or update the section's recurring weekly event; return its id."""
        raise NotImplementedError

    def delete_section_event(self, section) -> None:
        """Remove the section's calendar event, if any."""
        raise NotImplementedError

    def delete_course_calendar(self, course) -> None:
        """Delete the course's calendar at the end of the term."""
        raise NotImplementedError
