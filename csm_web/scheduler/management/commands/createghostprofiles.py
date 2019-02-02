import csv
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from collections import OrderedDict
from scheduler.models import Profile, Course, User

PROFILE_CSV_DEFAULT_FIELDS = ("name", "email", "role")

ROLE_MAP = {
    "Coordinator": Profile.COORDINATOR,
    "Senior Mentor": Profile.SENIOR_MENTOR,
    "Junior Mentor": Profile.JUNIOR_MENTOR,
    "Student": Profile.STUDENT,
}


class Command(BaseCommand):
    help = """Creates 'ghost' profiles for users who have not yet logged in to Scheduler.
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
            "--student",
            action="store_true",
            dest="is_students",
            help="if specified, assumes that all users entered are students",
        )
        parser.add_argument(
            "--withheader",
            action="store_true",
            dest="withheader",
            help="specifies that the first row of the CSV file should be read as column names, otherwise uses PROFILE_CSV_DEFAULT_FIELDS",
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        count = 0
        try:
            with open(filename) as csvfile:
                reader = iter(csv.reader(csvfile))
                if options["withheader"]:
                    # treat the first row as column names
                    cols = [s.lower() for s in next(reader)]
                else:
                    cols = PROFILE_CSV_DEFAULT_FIELDS
                self._check_cols(cols, options)
                course = Course.objects.get(name=options["course"])
                try:
                    with transaction.atomic():
                        for row in reader:
                            self._create_single_profile(cols, row, course, options)
                            count += 1
                except IntegrityError as e:
                    self.stderr.write(
                        "Failed after generating {} profile(s)".format(count)
                    )
                    raise e
        except csv.Error as e:
            self.stderr.write("Unable to read CSV file.")
            raise e
        self.stdout.write("Generated {} profile(s).".format(count))

    def _check_cols(self, cols, options):
        if options["is_students"] and "role" in cols:
                raise Exception(
                    "'role' column was found in CSV, but --student was specified"
                )
        if not options["is_students"] and "role" not in cols:
            raise Exception("'role' column missing (found {})".format(cols))
        if "email" not in cols:
            raise Exception("'email' column missing (found {})".format(cols))

    def _create_single_profile(self, cols, row, course, options):
        """
        Creates a single profile object from the parameters passed in the row of a CSV file.
        - cols: an iterable specifying the order of the columns
        - row: the row of the CSV file (a list of values)
        """
        # TODO for students, match section to mentor, and generate attendances (maybe as an object hook?)
        fields = {}
        for i in range(len(row)):
            field = cols[i]
            fields[field] = row[i]
        if options["is_students"]:
            fields["role"] = Profile.STUDENT
        # NOTE: the "name" field is ignored, as we're letting oauth handle that for us
        # NOTE: unsure if this accounts for normalization, i.e. fname.lname@gmail vs fnamelname@gmail
        # also unsure if lack of password will mess with social-auth; that's to be tested
        email = fields["email"]
        user, _ = User.objects.get_or_create(username=email.split("@")[0], email=email)
        Profile.objects.create(role=fields["role"], course=course, user=user)
