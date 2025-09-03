import csv

from django.core.management import BaseCommand
from scheduler.models import Mentor, Section


class Command(BaseCommand):
    help = "Prints information about the sections belonging to mentors with the given emails."

    def add_arguments(self, parser):
        parser.add_argument("emails", nargs="+")

    def handle(self, *args, **options):
        for email in options["emails"]:
            mentors = Mentor.objects.filter(user__email=email)
            self.stdout.write(f"====SECTIONS FOR MENTOR {email}====")
            for mentor in mentors:
                self.stdout.write(
                    "    - {}; students {}".format(
                        mentor.section,
                        [
                            s.user.email
                            for s in mentor.section.students.filter(active=True)
                        ],
                    )
                )
