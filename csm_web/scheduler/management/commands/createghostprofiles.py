from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from collections import OrderedDict
from scheduler.models import Profile, Course, User

# from django.contrib.auth.models import User as AuthUser
import csv

PROFILE_CSV_DEFAULT_FIELDS = ("email", "course", "role")
PROFILE_CSV_DEFAULT_ACTIONS = {
    "email": lambda s: s,
    "course": lambda s: Course.objects.get(name=s),
    "role": lambda s: s,
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
        parser.add_argument("csv_path", nargs=1, type=str)
        parser.add_argument("--student", action="store_true", dest="is_students")
        parser.add_argument("--course", action="store", dest="course", type=str)

    def handle(self, *args, **options):
        filename = options["csv_path"][0]
        try:
            with open(filename) as csvfile:
                try:
                    with transaction.atomic():
                        reader = csv.reader(csvfile)
                        for row in reader:
                            self._create_single_profile(row, options)
                except IntegrityError as e:
                    self.stderr.write("Error while generating ghost profiles")
                    self.stderr.write(e)
        except csv.Error:
            self.stderr.write("Unable to read CSV file.")

    def _create_single_profile(self, row, options):
        """Creates a single profile object from the parameters passed in the row of a CSV file."""
        # TODO for students, match section to mentor, and generate attendances (maybe as an object hook?)
        fields = {}
        for i in range(len(row)):
            field = PROFILE_CSV_DEFAULT_FIELDS[i]
            fields[field] = PROFILE_CSV_DEFAULT_ACTIONS[field](row[i])
        if options["is_students"]:
            fields["role"] = Profile.STUDENT
        if options["course"] and options["course"] != fields["course"]:
            raise Exception(
                "Course in CSV does not match course provided as argument"
            )
            # NOTE: unsure if this accounts for normalization, i.e. fname.lname@gmail vs fnamelname2gmail
            # also unsure if lack of password will mess with social-auth; that's to be tested
        email = fields["email"]
        user, _ = User.objects.get_or_create(username=email.split("@")[0], email=email)
        Profile.objects.create(role=fields["role"], course=fields["course"], user=user)
