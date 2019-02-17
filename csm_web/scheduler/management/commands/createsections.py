"""
Creates section objects from CSV files.
The importing of CSVs containing sections booked by CSM is nice and organized and extensible.
The importing of CSVs for sections booked by individual mentors is hardcoded and a mess. srry :(
"""

import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from collections import OrderedDict
from scheduler.models import Profile, Course, Spacetime, Section, User
from scheduler.management.commands.params import COURSES

SECTION_CSV_DEFAULT_FIELDS = (
    "title",
    "day",
    "start time",
    "room",
    "end time",
    "invitees",
)

IGNORED_FIELDS = {"location", "date", "repeat", "occurrences", "", "notes"}

DAY_MAP = {
    "M": Spacetime.MONDAY,
    "T": Spacetime.TUESDAY,
    "W": Spacetime.WEDNESDAY,
    "R": Spacetime.THURSDAY,
    "F": Spacetime.FRIDAY,
}

SELFBOOK_DAY_MAP = {  # ngl this is pretty silly but w/e
    "Monday": Spacetime.MONDAY,
    "Tuesday": Spacetime.TUESDAY,
    "Wednesday": Spacetime.WEDNESDAY,
    "Thursday": Spacetime.THURSDAY,
    "Friday": Spacetime.FRIDAY,
}

# gets capacity of a section
CAPACITY_FUNCS = {
    # 70: all 4s
    COURSES.CS70: lambda _: 4,
    # 88: all 5s
    COURSES.CS88: lambda _: 5,
    # 61b: 4 for alcoves, 5 o.w.
    COURSES.CS61B: lambda spacetime: 4 if "Soda 283" in spacetime.location else 5,
    # 16a: all 5s
    COURSES.EE16A: lambda _: 5,
    COURSES.CS61C: lambda _: 5,
    COURSES.CS61A: lambda _: 5,
}


class Command(BaseCommand):
    help = """Creates Section and Spacetime objects given an input CSV file.
    Many assumptions are being made about the format of every column. They will be mentioned in the code comments /shrug."""

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path", type=str, help="the path to the csv file to be read"
        )
        parser.add_argument(
            "--test",
            action="store_true",
            dest="is_test",
            help="if specified, registers sections under courses prefixed by TEST_",
        )
        parser.add_argument(
            "--noheader",
            action="store_false",
            dest="withheader",
            help="if not specified, specifies that the first row of the CSV file should be read as column names, otherwise uses SECTION_CSV_DEFAULT_FIELDS",
        )
        parser.add_argument(
            "--omitfile",
            help="a CSV of courses/emails to be omited from section signups, likely because the course is handling those signups itself",
        )
        parser.add_argument(
            "--selfbookers",
            help="a CSV containing the course/email/time of all mentors who are booking library rooms",
        )

    generated = []

    def handle(self, *args, **options):
        filename = options["csv_path"]
        count = 0
        if options["omitfile"]:
            omits = self._get_omits(options["omitfile"])
        else:
            omits = {}
        # library bookings
        selfbook_file = options["selfbookers"]
        if selfbook_file:
            with open(selfbook_file) as sb_file:
                reader = iter(csv.reader(sb_file))
                # hardcoded headers :(
                next(reader)
                with transaction.atomic():
                    for row in reader:
                        count += self._create_self_booked_section(row, omits, options)
        # normal
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
                        count += self._create_booked_section(cols, row, omits, options)
                    self.stdout.write("Generated these mentor profiles:")
                    for p in self.generated:
                        self.stdout.write("{}".format(p))
                    prompt = input("[y/n]")
                    if prompt != "y":
                        raise Exception()
            except IndexError as e:
                self.stderr.write("cols: {}")
                raise e
            except IntegrityError as e:
                self.stderr.write(
                    "Failed after generating {} section(s).".format(count)
                )
                raise e
        self.stdout.write("Generated {} section(s).".format(count))

    def _get_omits(self, omitfile):
        omits = {}
        with open(omitfile) as csvfile:
            # assume no header
            reader = csv.reader(csvfile)
            for row in reader:
                course, email = row
                if course in omits:
                    omits[course].append(email)
                else:
                    omits[course] = [email]
        return omits

    def _get_col_name(self, s):
        t = s.lower()
        if t in SECTION_CSV_DEFAULT_FIELDS:
            return t
        elif t in IGNORED_FIELDS:
            return None
        else:
            raise Exception("Unknown column name: {}".format(s))

    def _create_self_booked_section(self, row, omits, options):
        """
        ASSUMED ORDER:
        name, email, course, day1, starttime1, day2, starttime2
        also hardcode section length for 16a
        """
        course_name = row[2].replace(" ", "")
        if course_name in COURSES.IGNORED_COURSES:
            return 0
        course = Course.objects.get(name=course_name)
        email = row[1]
        day_1 = SELFBOOK_DAY_MAP[row[3]]
        time_1 = dt.datetime.strptime(row[4], "%I:%M:%S %p")
        duration = dt.timedelta(
            hours=1, minutes=(30 if course_name == COURSES.EE16A else 0)
        )
        if row[7]:
            room = row[7]
        else:
            room = "TBD"
        count = self._save_objs(room, time_1, duration, day_1, course, email, omits)
        # second section
        if row[5] and row[6]:
            day_2 = SELFBOOK_DAY_MAP[row[5]]
            time_2 = dt.datetime.strptime(row[6], "%I:%M:%S %p")
            count += self._save_objs(
                room, time_2, duration, day_2, course, email, omits
            )
        return count

    def _create_booked_section(self, cols, row, omits, options):
        fields = {}
        for i in range(len(row)):
            field = cols[i]
            fields[field] = row[i]
        # BIG ASSUMPTION: "title" column is of form "CSM CS61A Section"
        course_name = fields["title"].split()[1].replace(" ", "")
        if course_name in COURSES.IGNORED_COURSES:
            return 0
        email = fields["invitees"]
        if options["is_test"]:
            course_name = "TEST_{}".format(course_name)
        course = Course.objects.get(name=course_name)
        # *** create spacetime ***
        day_of_week = DAY_MAP.get(fields["day"], SELFBOOK_DAY_MAP.get(fields["day"]))
        room = fields["room"]
        # https://stackoverflow.com/questions/35241643/
        get_time = (
            lambda s: dt.datetime.combine(dt.date.min, dt.time.fromisoformat(s))
            - dt.datetime.min
        )
        start_time = dt.time.fromisoformat(fields["start time"])
        end_time = get_time(fields["end time"])
        # need to be datetimes to get timedelta
        duration = end_time - get_time(fields["start time"])
        return self._save_objs(
            room, start_time, duration, day_of_week, course, email, omits
        )

    seen_sections = set()

    def _save_objs(self, room, start_time, duration, day_of_week, course, email, omits):
        if course.name in COURSES.IGNORED_COURSES:
            return 0
        if email in omits.get(course.name, []):
            self.stdout.write("{}: omitted section for {}".format(course.name, email))
            return 0
        obj = (room, start_time, day_of_week, course, email)
        old_profiles = Profile.objects.filter(
            user__email=email,
            section__course=course,
            section__default_spacetime__location=room,
            section__default_spacetime__start_time=start_time,
            section__default_spacetime__day_of_week=day_of_week,
        )
        if old_profiles.count() > 0:
            return 0
        if obj in self.seen_sections:
            self.stderr.write("Duplicate section: {}".format(obj))
            raise Exception()
        self.seen_sections.add(obj)
        spacetime = Spacetime.objects.create(
            location=room,
            start_time=start_time,
            duration=duration,
            day_of_week=day_of_week,
        )
        # *** create section ***
        capacity = CAPACITY_FUNCS[course.name](
            spacetime
        )  # want this to error if bad course
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
        self.generated.append(profile)
        return 1
