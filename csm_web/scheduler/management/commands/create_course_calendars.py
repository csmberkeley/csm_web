"""Recreate a Google Calendar for each course.

Run at the start of the semester:

    python csm_web/manage.py sync_course_calendars

Deletes each course's existing calendar (if any) and creates a fresh one.
"""

from django.core.management.base import BaseCommand

from scheduler.models import Course
from scheduler.notifications.gcal import GoogleCalendarClient


class Command(BaseCommand):
    help = "Recreate a Google Calendar for every course."

    def handle(self, *args, **options):
        client = GoogleCalendarClient()

        for course in Course.objects.all():
            if course.calendar_id:
                client.delete_calendar(course.calendar_id)
            client.create_calendar(course)
            self.stdout.write(
                self.style.SUCCESS(f"Synced calendar for {course.name}")
            )
