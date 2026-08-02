"""Google Calendar integration for section meetings.

Each course has its own calendar; each section becomes a recurring weekly event
on it. Uses the shared mentors@berkeley.edu credentials.
"""

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from scheduler.notifications.ops_notifications import get_google_credentials

CALENDAR_TIME_ZONE = "America/Los_Angeles"

class GoogleCalendarClient:
    """Wrapper for the Google Calendar API."""

    def __init__(self):
        self.service = build("calendar", "v3", credentials=get_google_credentials())

    def create_calendar(self, course):
        """Create a calendar for the course, return its id"""
        pass

    def delete_calendar(self, calendar_id):
        """Delete a calendar by id"""

    def create_event(self, calendar_id, body):
        """Create an event on a calendar, return the created event."""
        pass

    def update_event(self, calendar_id, event_id, body):
        """Replace an existing event; return the updated event."""
        pass

    def get_event(self, calendar_id, event_id):
        """Fetch a single event."""
        pass

    def delete_event(self, calendar_id, event_id):
        """Delete a single event"""
        pass

    def list_events(self, calendar_id):
        """List the events on a calendar."""
        pass
