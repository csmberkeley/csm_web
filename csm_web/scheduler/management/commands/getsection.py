import csv
from django.core.management import BaseCommand
from scheduler.models import Profile, Section


class Command(BaseCommand):
    help = "Prints information about the sections belonging to mentors with the given emails."

    def add_arguments(self, parser):
        parser.add_argument("emails", nargs="+")

    def handle(self, *args, **options):
        for email in options["emails"]:
            profs = Profile.objects.filter(user__email=email).exclude(
                role=Profile.STUDENT
            )
            self.stdout.write("====SECTIONS FOR MENTOR {}====".format(email))
            for profile in profs:
                self.stdout.write(
                    "    - {}; students {}".format(
                        profile.section,
                        [s.user.email for s in profile.section.active_students],
                    )
                )
