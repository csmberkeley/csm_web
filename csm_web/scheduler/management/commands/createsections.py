import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from collections import OrderedDict
from scheduler.models import Profile, Course, Spacetime, Section, User

SECTION_CSV_DEFAULT_FIELDS = ("title", "date", "day", "start time", "room", "end time", "invitees")

IGNORED_FIELDS = { "location", "repeat", "occurrences", "" }

DAY_MAP = {
    "M": Spacetime.MONDAY,
    "T": Spacetime.TUESDAY,
    "W": Spacetime.WEDNESDAY,
    "R": Spacetime.THURSDAY,
    "F": Spacetime.FRIDAY
}

class Command(BaseCommand):
    help = """Creates Section and Spacetime objects given an input CSV file.
    Many assumptions are being made about the format of every column. They will be mentioned in the code comments /shrug."""

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="the path to the csv file to be read")
        parser.add_argument("--test", action="store_true", dest="is_test",
            help="if specified, registers sections under courses prefixed by TEST_")
        parser.add_argument(
            "--noheader",
            action="store_false",
            dest="withheader",
            help="if not specified, specifies that the first row of the CSV file should be read as column names, otherwise uses SECTION_CSV_DEFAULT_FIELDS",
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        count = 0
        with open(filename) as csvfile:
            reader = iter(csv.reader(csvfile))
            if options["withheader"]:
                cols = [self._get_col_name(s) for s in next(reader)]
                missing_cols = set(SECTION_CSV_DEFAULT_FIELDS) - set(cols)
                if len(missing_cols) != 0:
                    raise Exception("Missing columns: {}".format(missing_cols))
            else:
                cols = SECTION_CSV_DEFAULT_FIELDS
            try:
                with transaction.atomic():
                    for row in reader:
                        self._create_single_section(cols, row, options)
                        count += 1
            except IndexError as e:
                self.stderr.write("cols: {}")
                raise e
            except IntegrityError as e:
                self.stderr.write("Failed after generating {} section(s).".format(count))
                raise e
        self.stdout.write("Generated {} section(s).".format(count))

    def _get_col_name(self, s):
        t = s.lower()
        if t in SECTION_CSV_DEFAULT_FIELDS:
            return t
        elif t in IGNORED_FIELDS:
            return None
        elif t in FIELD_ALIASES:
            return FIELD_ALIASES[s]
        else:
            raise Exception("Unknown column name: {}".format(s))

    def _create_single_section(self, cols, row, options):
        fields = {}
        for i in range(len(row)):
            field = cols[i]
            fields[field] = row[i]
        # BIG ASSUMPTION: "title" column is of form "CSM CS61A Section"
        course_name = fields["title"].split()[1]
        if options["is_test"]:
            course_name = "TEST_{}".format(course_name)
        course = Course.objects.get(name=course_name)
        # *** create spacetime ***
        day_of_week = DAY_MAP[fields["day"]]
        room = fields["room"]
        # https://stackoverflow.com/questions/35241643/
        get_time = lambda s: dt.datetime.combine(dt.date.min, dt.time.fromisoformat(s)) - dt.datetime.min
        start_time = dt.time.fromisoformat(fields["start time"])
        end_time = get_time(fields["end time"])
        # need to be datetimes to get timedelta
        duration = end_time - get_time(fields["start time"])
        spacetime = Spacetime.objects.create(location=room, start_time=start_time,
            duration=duration, day_of_week=day_of_week)
        # *** create section ***
        # TODO identify capacities for courses
        section = Section.objects.create(course=course, default_spacetime=spacetime, capacity=6)
        # *** create profiles to be filled later ***
        email = fields["invitees"]
        chunks = email.split("@")
        if len(chunks) != 2:
            raise Exception("Malformed email: {}".format(email))
        if chunks[1] != "berkeley.edu":
            raise Exception("Non-Berkeley email found: {}".format(email))
        user, _ = User.objects.get_or_create(username=chunks[0], email=email)
        profile = Profile.objects.create(user=user, course=course, section=section)
