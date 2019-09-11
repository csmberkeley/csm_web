import csv
import datetime as dt
from django.core.management import BaseCommand
from scheduler.models import Course, Attendance


class Command(BaseCommand):
    help = "Exports a CSV of all attendances for all students in the given course to stdout."

    def add_arguments(self, parser):
        parser.add_argument("course", type=str, help="the name of the course")

    def _get_time(self, time):
        return dt.datetime.combine(dt.date.min, time)

    def handle(self, *args, **options):
        course = Course.objects.get(name=options["course"])
        attendances = Attendance.objects.filter(
            section__course=course, attendee__active=True
        ).order_by(
            "week_start",
            "section__default_spacetime__day_of_week",
            "section__default_spacetime__start_time",
            "attendee__leader",
        )

        # write columns
        cols = (
            "Student Name",
            "Student Email",
            "Week Start",
            "Attendance",
            "Mentor Name",
            "Mentor Email",
            "Section Day",
            "Section Time",
        )
        self._write(cols)
        for a in attendances:
            student = a.attendee
            section = a.section
            mentor = section.mentor
            spacetime = section.default_spacetime
            row = (
                student.user.get_full_name(),
                student.user.email,
                str(a.week_start),
                a.presence,
                mentor.user.get_full_name(),
                mentor.user.email,
                spacetime.day_of_week,
                str(spacetime.start_time),
            )
            self._write(row)

    def _write(self, row):
        self.stdout.write(",".join(row))
