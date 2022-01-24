import random

from django.core.management import BaseCommand
from django.core.exceptions import ValidationError
from scheduler.models import MatcherSlot, MatcherPreference, Mentor


class Command(BaseCommand):
    help = "Populates database with randomly generated data for matcher testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "course", type=str, help="course to generate matcher data for"
        )

    def handle(self, *args, **options):
        course = options["course"]

        slots = MatcherSlot.objects.filter(course__name=course)
        mentors = Mentor.objects.filter(course__name=course, section=None)

        for mentor in mentors:
            for slot in slots:
                pref = random.randint(0, 10)
                try:
                    MatcherPreference.objects.create(
                        slot=slot,
                        mentor=mentor,
                        preference=pref,
                    )
                    print(f"CREATED {mentor}/{slot}: preference {pref}")
                except ValidationError:
                    print(f"{mentor.user.email}/{slot.times} preference already exists")
