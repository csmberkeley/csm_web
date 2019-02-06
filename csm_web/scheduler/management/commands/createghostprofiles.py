import csv
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from collections import OrderedDict
from scheduler.models import Profile, Course, User

PROFILE_CSV_DEFAULT_FIELDS = ("name", "email", "role")

# aliases
FIELD_ALIASES = {"full name": "name"}

IGNORED_FIELDS = {"returning", "paid", "paid tutor", ""}

ROLE_MAP = {
    "Coordinator": Profile.COORDINATOR,
    "Senior Mentor": Profile.SENIOR_MENTOR,
    "Associate Mentor": Profile.ASSOCIATE_MENTOR,
    "Junior Mentor": Profile.JUNIOR_MENTOR,
    "Student": Profile.STUDENT,
}


class Command(BaseCommand):
    help = """Creates 'ghost' profiles for users who have not yet logged in to Scheduler.
    This should be run only after all sections have been entered.
    This takes in a CSV file where each row contains the user's name, email, and role, and generates
    profile objects as specified.
    The path to the CSV file and the course the file is for are specified as arguments.
    User profiles are created through the Django ORM, and the social/oauth objects will be associated
    for those users when they log in for the first time.
    """
    """
    Refer here for details on associating python-social-auth objects with users:
    https://python-social-auth-docs.readthedocs.io/en/latest/configuration/django.html#personalized-configuration
    """

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path", type=str, help="the path to the CSV file to be read"
        )
        parser.add_argument(
            "course", type=str, help="the slug for the course being entered"
        )
        parser.add_argument(
            "--test",
            action="store_true",
            dest="is_test",
            help="if specified, any section with role that's not SM/coord will be removed, \
                and the role will be set to student instead for testing purposes",
        )
        parser.add_argument(
            "--student",
            action="store_true",
            dest="is_students",
            help="if specified, assumes that all users entered are students",
        )
        parser.add_argument(
            "--noheader",
            action="store_false",
            dest="withheader",
            help="if not specified, specifies that the first row of the CSV file should be read as column names, otherwise uses PROFILE_CSV_DEFAULT_FIELDS",
        )
        parser.add_argument(
            "--nullsections",
            action="store_true",
            dest="nullsections",
            help="ignores section field of profile (should be used only for testing)",
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        count = 0
        try:
            with open(filename) as csvfile:
                reader = iter(csv.reader(csvfile))
                if options["withheader"]:
                    # treat the first row as column names
                    cols = [self._get_col_name(s) for s in next(reader)]
                else:
                    cols = PROFILE_CSV_DEFAULT_FIELDS
                self._check_cols(cols, options)
                course = Course.objects.get(name=options["course"])
                try:
                    with transaction.atomic():
                        for row in reader:
                            self._update_profile(cols, row, course, options)
                            count += 1
                except IndexError as e:
                    self.stderr.write("cols: {}")
                    raise e
                except IntegrityError as e:
                    self.stderr.write(
                        "Failed after generating {} profile(s).".format(count)
                    )
                    raise e
        except csv.Error as e:
            self.stderr.write("Unable to read CSV file.")
            raise e
        self.stdout.write("Generated {} profile(s).".format(count))

    def _get_col_name(self, s):
        t = s.lower()
        if t in PROFILE_CSV_DEFAULT_FIELDS:
            return t
        elif t in IGNORED_FIELDS:
            return None
        elif t in FIELD_ALIASES:
            return FIELD_ALIASES[t]
        else:
            raise Exception("Unknown column name: {}".format(s))

    def _check_cols(self, cols, options):
        if options["is_students"] and "role" in cols:
            raise Exception(
                "'role' column was found in CSV, but --student was specified"
            )
        if not options["is_students"] and "role" not in cols:
            raise Exception("'role' column missing (found {})".format(cols))
        if "email" not in cols:
            raise Exception("'email' column missing (found {})".format(cols))

    def _update_profile(self, cols, row, course, options):
        """
        Updates profile object from the parameters passed in the row of a CSV file.
        These profiles should have been created beforehand when section times were entered.
        If --nullsections was passed, then profile objects are created instead. This should
        be used only in testing.
        - cols: an iterable specifying the order of the columns
        - row: the row of the CSV file (a list of values)
        """
        # TODO for students, match section to mentor, and generate attendances (maybe as an object hook?)
        fields = {}
        for i in range(len(row)):
            # field index can definitely be lifted out of this function; to optimize later
            field = cols[i]
            fields[field] = row[i]
        if options["is_students"]:
            fields["role"] = Profile.STUDENT
        # NOTE: the "name" field is ignored, as we're letting oauth handle that for us
        # NOTE: unsure if this accounts for normalization, i.e. fname.lname@gmail vs fnamelname@gmail
        # also unsure if lack of password will mess with social-auth; that's to be tested
        email = fields["email"]
        chunks = email.split("@")
        if len(chunks) != 2:
            raise Exception("Malformed email: {}".format(email))
        if chunks[1] != "berkeley.edu":
            raise Exception("Non-Berkeley email found: {}".format(email))
        user, _ = User.objects.get_or_create(username=chunks[0], email=email)
        if options["nullsections"]:
            Profile.objects.create(
                role=ROLE_MAP[fields["role"]], course=course, user=user
            )
        else:
            # user and course fields should already be filled correctly, just update role
            Profile.objects.filter(user=user, course=course).update(
                role=ROLE_MAP[fields["role"]]
            )
        if options["is_test"]:
            # only allow SMs to have sections for testing purposes
            for profile in Profile.objects.filter(user=user, course=course):
                if profile.role not in (
                    Profile.STUDENT,
                    Profile.SENIOR_MENTOR,
                    Profile.COORDINATOR,
                ):
                    profile.delete()
                    Profile.objects.create(
                        role=Profile.STUDENT, course=course, user=user
                    )
