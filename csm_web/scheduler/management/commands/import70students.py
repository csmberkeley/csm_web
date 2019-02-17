import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import Profile, Section, User, Spacetime, Course


class Command(BaseCommand):
    help = "Imports students from a CSV and enrolls them. CS70 is whack /shrug"

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path", type=str, help="the path to the CSV file to be read"
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        with open(filename) as csvfile:
            reader = iter(csv.reader(csvfile))
            next(reader)
            with transaction.atomic():
                course = Course.objects.get(name="CS70")
                for row in reader:
                    student_email = row[2]
                    mentor_email = row[4]
                    day_1, day_2 = self._parse_days(row[6])
                    start_time = dt.time.fromisoformat(row[7])
                    self._enroll(
                        student_email, mentor_email, day_1, day_2, start_time, course
                    )

    def _parse_days(self, days):
        d1, d2 = [d.lower().strip() for d in days.split("/")]
        DAY_MAP = {
            "m": Spacetime.MONDAY,
            "t": Spacetime.TUESDAY,
            "w": Spacetime.WEDNESDAY,
            "th": Spacetime.THURSDAY,
            "f": Spacetime.FRIDAY,
        }
        return DAY_MAP[d1], DAY_MAP[d2]

    def _enroll(self, stud_email, mentor_email, day_1, day_2, start_time, course):
        # Checks that the mentor has exactly 2 sections and that they have the correct spactimes
        mentor_profiles = Profile.objects.filter(
            user__email=mentor_email, course=course, section__capacity__gt=0
        )
        # section count
        assert mentor_profiles.count() == 2
        prof_1, prof_2 = mentor_profiles
        st_1, st_2 = prof_1.section.default_spacetime, prof_2.section.default_spacetime
        days = [st_1.day_of_week, st_2.day_of_week]
        # spacetime check
        assert day_1 in days
        assert day_2 in days
        assert st_1.start_time == start_time
        assert st_2.start_time == start_time
        # enroll
        chunks = stud_email.split("@")
        if len(chunks) != 2:
            raise Exception("Malformed email: {}".format(stud_email))
        if chunks[1] != "berkeley.edu":
            self.stderr.write("Non-Berkeley email found: {}".format(stud_email))
            # don't fail, but save nothing (max will email them)
            return
        user, _ = User.objects.get_or_create(username=chunks[0], email=stud_email)
        Profile.objects.create(
            course=course,
            leader=prof_1,
            role=Profile.STUDENT,
            user=user,
            section=prof_1.section,
        )
        Profile.objects.create(
            course=course,
            leader=prof_2,
            role=Profile.STUDENT,
            user=user,
            section=prof_2.section,
        )
