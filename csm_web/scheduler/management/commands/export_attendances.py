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
            student__section__course=course,
            student__active=True
        ).order_by(
            "date",
            "student__section__spacetime__day_of_week",
            "student__section__spacetime__start_time",
            "student__section__mentor",
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
        for attendance in attendances:
            student = attendance.student
            section = student.section
            mentor = section.mentor
            spacetime = section.spacetime
            row = (
                student.user.get_full_name(),
                student.user.email,
                str(attendance.week_start),
                attendance.presence,
                mentor.user.get_full_name(),
                mentor.user.email,
                spacetime.day_of_week,
                str(spacetime.start_time),
            )
            self._write(row)

    def _write(self, row):
        self.stdout.write(",".join(row))
