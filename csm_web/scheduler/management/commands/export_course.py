import csv
import datetime as dt
from django.core.management import BaseCommand
from scheduler.models import Course, Profile, Spacetime

DAY_MAP = {  # ngl this is pretty silly but w/e
    Spacetime.MONDAY: "Monday",
    Spacetime.TUESDAY: "Tuesday",
    Spacetime.WEDNESDAY: "Wednesday",
    Spacetime.THURSDAY: "Thursday",
    Spacetime.FRIDAY: "Friday",
}


class Command(BaseCommand):
    help = "Exports a CSV of all students in the given course to stdout."

    def add_arguments(self, parser):
        parser.add_argument("course", type=str, help="the name of the course")

    def _get_time(self, time):
        return dt.datetime.combine(dt.date.min, time)

    def handle(self, *args, **options):
        course = Course.objects.get(name=options["course"])
        students = Profile.objects.filter(
            course=course, active=True, role=Profile.STUDENT
        )
        # write columns
        cols = (
            "Day",
            "Start time",
            "Room",
            "End time",
            "Mentor email",
            "Student email",
        )
        self._write(cols)
        for stud in students:
            section = stud.section
            st = section.default_spacetime
            row = (
                DAY_MAP[st.day_of_week],
                st.start_time.strftime("%I:%M %p"),
                st.location,
                (self._get_time(st.start_time) + st.duration)
                .time()
                .strftime("%I:%M %p"),
                section.mentor.user.email,
                stud.user.email,
            )
            self._write(row)

    def _write(self, row):
        self.stdout.write(",".join(row))
