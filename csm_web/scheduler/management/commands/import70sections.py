import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import Profile, Section, User, Spacetime, Course


class Command(BaseCommand):
    help = "Import CS70 sections because their format is different /shrug."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path", type=str, help="the path to the CSV file to be read"
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        with open(filename) as csvfile:
            reader = iter(csv.reader(csvfile))
            next(reader)
            # once again, asserting an order for columns
            with transaction.atomic():
                course = Course.objects.get(name="CS70")
                for row in reader:
                    email = row[2]
                    day_1, day_2 = self._parse_days(row[3])
                    start_time = dt.time.fromisoformat(row[4])
                    room_1, room_2 = row[6], row[7]
                    capacity = 4 if "Soda 283" in room_1 or "Soda 283" in room_2 else 5
                    self._save_section(
                        room_1, start_time, day_1, course, email, capacity
                    )
                    self._save_section(
                        room_2, start_time, day_2, course, email, capacity
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

    def _save_section(self, room, start_time, day_of_week, course, email, capacity):
        if room == "":
            room = "TBD"
        spacetime = Spacetime.objects.create(
            location=room,
            start_time=start_time,
            duration=dt.timedelta(hours=1),
            day_of_week=day_of_week,
        )
        section = Section.objects.create(
            course=course, default_spacetime=spacetime, capacity=capacity
        )
        # *** create profiles to be filled later ***
        chunks = email.split("@")
        if len(chunks) != 2:
            raise Exception("Malformed email: {}".format(email))
        if chunks[1] != "berkeley.edu":
            raise Exception("Non-Berkeley email found: {}".format(email))
        user, _ = User.objects.get_or_create(username=chunks[0], email=email)
        profile = Profile.objects.get_or_create(
            user=user, course=course, section=section
        )
