import csv
import datetime as dt
from django.core.management import BaseCommand
from scheduler.models import Course, Student, Spacetime


class Command(BaseCommand):
    help = "Exports a CSV of all students in the given course to stdout."

    def add_arguments(self, parser):
        parser.add_argument("course", type=str, help="the name of the course")

    def handle(self, *args, **options):
        course = Course.objects.get(name=options["course"])
        students = Student.objects.filter(section__course=course, active=True)
        # write columns
        cols = (
            "Day",
            "Start time",
            "Room",
            "Mentor email",
            "Student email",
        )
        self._write(cols)
        for stud in students:
            section = stud.section
            st = section.spacetime
            row = (
                st.day_of_week,
                st.start_time.strftime("%I:%M %p"),
                st.location,
                section.mentor.user.email,
                stud.user.email,
            )
            self._write(row)

    def _write(self, row):
        self.stdout.write(",".join(row))
