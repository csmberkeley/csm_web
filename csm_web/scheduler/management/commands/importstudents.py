import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import Profile, Section, User, Spacetime

STUDENT_CSV_DEFAULT_FIELDS = (
    "title",
    "day",
    "start time",
    "room",
    "end time",
    "mentor email",
    "student email",
)
SELFBOOK_DAY_MAP = {  # ngl this is pretty silly but w/e
    "Monday": Spacetime.MONDAY,
    "Tuesday": Spacetime.TUESDAY,
    "Wednesday": Spacetime.WEDNESDAY,
    "Thursday": Spacetime.THURSDAY,
    "Friday": Spacetime.FRIDAY,
}


class Command(BaseCommand):
    help = "Imports students from a CSV and enrolls them as needed. If the student is already \
enrolled in the course, then it drops them from their old section and assigns them to their new one."

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path", type=str, help="the path to the CSV file to be read"
        )

    multiple_enrollees = []

    def handle(self, *args, **options):
        filename = options["csv_path"]
        with open(filename) as csvfile:
            reader = iter(csv.reader(csvfile))
            cols = next(reader)
            if set(cols) != set(STUDENT_CSV_DEFAULT_FIELDS):
                raise Exception("CSV columns {} did not match expected".format(cols))
            profiles = []
            with transaction.atomic():
                for row in reader:
                    fields = {}
                    for i in range(len(row)):
                        field = cols[i]
                        fields[field] = row[i]
                    try:
                        section = self._get_section(fields)
                    except Exception as e:
                        print(row)
                        raise e
                    profiles.append(self._enroll(section, fields["student email"]))
                self.stdout.write("Generated these profiles:")
                for prof in profiles:
                    self.stdout.write("{}, {}".format(prof, prof.user.email))
                self.stderr.write("These people were dropped from previous sections:")
                self.stderr.write("{}".format(self.multiple_enrollees))
                prompt = input("[y/n]")
                if prompt != "y":
                    raise Exception()

    def _get_section(self, fields):
        get_time = (
            lambda s: dt.datetime.combine(
                dt.date.min, dt.datetime.strptime(s, "%I:%M %p").time()
            )
            - dt.datetime.min
        )
        # assume format is "CSM CS61B ..."
        course = fields["title"].split()[1]
        get_time = (
            lambda s: dt.datetime.combine(dt.date.min, dt.time.fromisoformat(s))
            - dt.datetime.min
        )
        start_time = dt.time.fromisoformat(fields["start time"])
        end_time = get_time(fields["end time"])
        # need to be datetimes to get timedelta
        duration = end_time - get_time(fields["start time"])
        return Profile.objects.get(
            user__email=fields["mentor email"],
            section__course__name=course,
            section__default_spacetime__day_of_week=SELFBOOK_DAY_MAP[fields["day"]],
            section__default_spacetime__start_time=start_time,
            section__default_spacetime__duration=duration,
            section__default_spacetime__location=fields["room"],
        ).section

    def _enroll(self, section, stud_email):
        chunks = stud_email.split("@")
        if len(chunks) != 2:
            raise Exception("Malformed email: {}".format(stud_email))
        if chunks[1] != "berkeley.edu":
            raise Exception("Non-Berkeley email found: {}".format(stud_email))
        user, _ = User.objects.get_or_create(username=chunks[0], email=stud_email)
        old_students = Profile.objects.filter(
            active=True, course=section.course, role=Profile.STUDENT, user=user
        )
        if old_students.count() > 0:
            fst = old_students.first()
            old_students.update(active=False)  # drop them
            self.stdout.write(
                "Dropping {} from {} before signup".format(fst, fst.section)
            )
            self.multiple_enrollees.append(stud_email)
        return Profile.objects.create(
            course=section.course, role=Profile.STUDENT, user=user, section=section
        )
