"""
Swaps section times for existing sections.
"""

import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import Profile, Spacetime

DAY_MAP = {
    "M": Spacetime.MONDAY,
    "T": Spacetime.TUESDAY,
    "W": Spacetime.WEDNESDAY,
    "R": Spacetime.THURSDAY,
    "F": Spacetime.FRIDAY,
}


class Command(BaseCommand):
    help = """Swaps section times for existing sections. Requires prompt to complete.
Assumes that the order of colums is `mentor email` | `old start time` | `old day` | `new start time` | `new day` | `new location`
    """

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path", type=str, help="the path to the csv file to be read"
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        with open(filename) as csvfile:
            reader = iter(csv.reader(csvfile))
            next(reader)
            with transaction.atomic():
                swaps = []
                for row in reader:
                    email = row[0]
                    # NOTE THE DIFFERENT FORMAT STRING FROM CREATESECTIONS
                    old_start = dt.datetime.strptime(row[1], "%I:%M %p")
                    old_day = DAY_MAP[row[2]]
                    # safe assumption that a mentor cannot teach 2 sections at the same time
                    section = Profile.objects.get(
                        user__email=email,
                        section__default_spacetime__start_time=old_start,
                        section__default_spacetime__day_of_week=old_day,
                    ).section
                    sts = Spacetime.objects.filter(section=section)
                    assert sts.count() == 1
                    swaps.append((section.mentor.user.email, section))
                    new_start = dt.datetime.strptime(row[3], "%I:%M %p")
                    new_day = DAY_MAP[row[4]]
                    new_room = row[5] if row[5] else "TBD"
                    sts.update(
                        start_time=new_start, day_of_week=new_day, location=new_room
                    )
                self.stdout.write("Confirm these new section times: {}".format(swaps))
                prompt = input("[y/n] ")
                if prompt != "y":
                    raise Exception()
