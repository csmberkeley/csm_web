import csv
from django.core.management import BaseCommand
from scheduler.models import Mentor, Section


class Command(BaseCommand):
    help = "Prints information about the sections belonging to mentors with the given emails."

    def add_arguments(self, parser):
        parser.add_argument("emails", nargs="+")

    def handle(self, *args, **options):
        for email in options["emails"]:
            profs = Mentor.objects.filter(user__email=email)
            self.stdout.write("====SECTIONS FOR MENTOR {}====".format(email))
            for profile in profs:
                self.stdout.write(
                    "    - {}; students {}".format(
                        profile.section,
                        [s.user.email for s in profile.section.students.filter(active=True)],
                    )
                )
