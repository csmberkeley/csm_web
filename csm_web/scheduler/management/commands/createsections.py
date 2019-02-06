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
    "date",
    "day",
    "start time",
    "room",
    "end time",
    "invitees",
)

IGNORED_FIELDS = {"location", "repeat", "occurrences", ""}

DAY_MAP = {
    "M": Spacetime.MONDAY,
    "T": Spacetime.TUESDAY,
    "W": Spacetime.WEDNESDAY,
    "R": Spacetime.THURSDAY,
    "F": Spacetime.FRIDAY,
}

SELFBOOK_DAY_MAP = { # ngl this is pretty silly but w/e
    "Monday": Spacetime.MONDAY,
    "Tuesday": Spacetime.TUESDAY,
    "Wednesday": Spacetime.WEDNESDAY,
    "Thursday": Spacetime.THURSDAY,
    "Friday": Spacetime.FRIDAY,
}

IGNORED_COURSES = { "CS70", "CS61A" } # they're doing their own stuff

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
    COURSES.CS61A: lambda _: 5
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
            help="a CSV of courses/emails to be ommited from section signups, likely because the course is handling those signups itself"
        )
        parser.add_argument(
            "--selfbook",
            action="store_true",
            dest="selfbook",
            help="if true, indicates that the mentors in the file are booking library rooms"
        )
        parser.add_argument(
            "--course",
            action="store",
            dest="course",
            help="if selfbook is specified, sets the course"
        )
        parser.add_argument(
            "--sm",
            action="store_true",
            dest="sm",
            help="if selfbook is specified, parses course field from CSV"
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        if options["selfbook"] and not (options["course"] or options["sm"]):
            raise Exception("must have --sm or --course with --selfbook")
        if options["course"] and not options["selfbook"]:
            raise Exception("--course specified without --selfbook")
        count = 0
        if options["omitfile"]:
            omits = self._get_omits(options["omitfile"])
        else:
            omits = {}
        with open(filename) as csvfile:
            reader = iter(csv.reader(csvfile))
            if options["withheader"] and not options["selfbook"]:
                cols = [self._get_col_name(s) for s in next(reader)]
                missing_cols = set(SECTION_CSV_DEFAULT_FIELDS) - set(cols)
                if len(missing_cols) != 0:
                    raise Exception("Missing columns: {}".format(missing_cols))
            else:
                cols = SECTION_CSV_DEFAULT_FIELDS
            if options["selfbook"]: # skip header
                next(reader)
            try:
                with transaction.atomic():
                    for row in reader:
                        if options["selfbook"]:
                            self._create_self_booked_section(row, omits, options)
                        else:
                            self._create_booked_section(cols, row, omits, options)
                        count += 1
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
        elif t in FIELD_ALIASES:
            return FIELD_ALIASES[s]
        else:
            raise Exception("Unknown column name: {}".format(s))

    def _create_self_booked_section(self, row, omits, options):
        """
        ASSUMED ORDER:
        timestamp, email, name, email, accept?, selfbook?, day1, starttime1, day2, starttime2
        also hardcode section length for 16a
        """
        course_name = (row[4] if options["sm"] else options["course"]).replace(" ", "")
        if course_name in COURSES.IGNORED_COURSES:
            return
        course = Course.objects.get(name=course_name)
        email = row[1]
        if email in omits.get(course_name, []):
            self.stdout.write("{}: not generating section for {}".format(course_name, email))
            return
        day_1 = SELFBOOK_DAY_MAP[row[6]]
        time_1 = dt.datetime.strptime(row[7], "%I:%M:%S %p")
        room = "TBD"
        duration = dt.timedelta(hours=1, minutes=(30 if course == COURSES.EE16A else 0))
        self._save_objs(room, time_1, duration, day_1, course, email)
        # second section
        if len(row) > 8 and row[8] and row[9]:
            day_2 = SELFBOOK_DAY_MAP[row[8]]
            time_2 = dt.datetime.strptime(row[9], "%I:%M:%S %p")
            self._save_objs(room, time_2, duration, day_2, course, email)

    def _create_booked_section(self, cols, row, omits, options):
        fields = {}
        for i in range(len(row)):
            field = cols[i]
            fields[field] = row[i]
        # BIG ASSUMPTION: "title" column is of form "CSM CS61A Section"
        course_name = fields["title"].split()[1].replace(" ", "")
        if course_name in COURSES.IGNORED_COURSES:
            return
        email = fields["invitees"]
        if email in omits.get(course_name, []):
            self.stdout.write("{}: not generating section for {}".format(course_name, email))
            return
        if options["is_test"]:
            course_name = "TEST_{}".format(course_name)
        course = Course.objects.get(name=course_name)
        # *** create spacetime ***
        day_of_week = DAY_MAP[fields["day"]]
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
        self._save_objs(room, start_time, duration, day_of_week, course, email)

    def _save_objs(self, room, start_time, duration, day_of_week, course, email):
        spacetime = Spacetime.objects.create(
            location=room,
            start_time=start_time,
            duration=duration,
            day_of_week=day_of_week,
        )
        # *** create section ***
        capacity = CAPACITY_FUNCS[course.name](spacetime) # want this to error if bad course
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
        profile = Profile.objects.get_or_create(user=user, course=course, section=section)
