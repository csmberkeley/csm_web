"""
Creates section objects with a CSV for mentors that are booking library rooms.
The expected input will have columns "Name", "Email", "Course", and "Time".
The time fmt string is akin to "Wednesday 01:00 PM".
The "Course" field likely will have a space in the middle, which ought to be yeeted.
A mentor can appear multiple times in this CSV.
"""

import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.management.commands.params import Courses  # pylint: disable=E0401
from scheduler.models import Course, User, Section, Mentor, Spacetime  # pylint: disable=E0401


class Cols:
    EMAIL = "Email"
    NAME = "Name"
    COURSE = "Course"
    TIME = "Time"


# gets capacity of a section
CAPACITIES = {
    Courses.CS70: 5,
    Courses.CS88: 4,
    Courses.CS61B: 5,
    Courses.EE16A: 5,
    Courses.EE16B: 5,
    Courses.CS61C: 5,
    Courses.CS61A: 5
}
# gets duration of a section
one_and_half_hr = dt.timedelta(hours=1, minutes=30)
one_hr = dt.timedelta(hours=1)
DURATIONS = {
    Courses.CS70: one_and_half_hr,
    Courses.CS88: one_hr,
    Courses.CS61B: one_hr,
    Courses.EE16A: one_and_half_hr,
    Courses.EE16B: one_and_half_hr,
    Courses.CS61C: one_hr,
    Courses.CS61A: one_hr
}

DAY_OF_WEEK_DICT = {
    "Monday": Spacetime.MONDAY,
    "Tuesday": Spacetime.TUESDAY,
    "Wednesday": Spacetime.WEDNESDAY,
    "Thursday": Spacetime.THURSDAY,
    "Friday": Spacetime.FRIDAY
}


def parse_time(timestring, course_name):
    """Returns a spacetime from a string of the form "Thursday [5:00 PM]"""
    day_of_week = DAY_OF_WEEK_DICT[timestring.split(" ")[0]]
    start_time = dt.datetime.strptime(timestring, "%A %I:%M %p").time()
    return Spacetime.objects.create(
        location="TBD",
        start_time=start_time,
        duration=DURATIONS[course_name],
        day_of_week=day_of_week
    )


class Command(BaseCommand):
    generated = []

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="the path to the csv file to be read")

    def handle(self, *args, **options):
        filename = options["csv_path"]
        count = 0
        with open(filename) as csvfile:
            reader = csv.DictReader(csvfile)
            try:
                with transaction.atomic():
                    for row in reader:
                        count += self.create_section(row)
                    self.stdout.write("Generated these sections:")
                    for p in self.generated:
                        self.stdout.write("{}".format(p))
                    prompt = input("Confirm creation of these sections [y/n]: ")
                    if prompt != "y":
                        raise Exception()
            except IntegrityError as e:
                self.stderr.write(f"Failed after generating {count} section(s).")
                raise e
            self.stdout.write("Generated {} section(s).".format(count))

    def create_section(self, row):
        email = row[Cols.EMAIL]
        chunks = email.split("@")
        if len(chunks) != 2:
            raise Exception("Malformed email: {}".format(email))
        if chunks[1] != "berkeley.edu":
            raise Exception("Non-Berkeley email found: {}".format(email))
        course_name = row[Cols.COURSE].replace(" ", "")
        course = Course.objects.get(name=course_name)
        user, created = User.objects.get_or_create(username=chunks[0], email=email)
        if created:
            name = row[Cols.NAME]
            user.first_name = name.split()[0]
            user.last_name = name.split()[-1]
            user.save()
        spacetime_0 = parse_time(row[Cols.TIME], course_name)
        profile_0 = Mentor.objects.create(user=user)
        section_0 = Section.objects.create(
            course=course,
            spacetime=spacetime_0,
            capacity=CAPACITIES[course_name],
            mentor=profile_0
        )
        self.generated.append(section_0)
        return 1
