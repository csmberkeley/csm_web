import json
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from django.utils import timezone
from scheduler.models import Course


class Command(BaseCommand):
    help = """Creates Course objects as specified by a JSON config file.
    The JSON can either contain a single course, or multiple courses.
    The datetimes in the file should be in ISO format, and will be treated as timezone aware."""

    def add_arguments(self, parser):
        parser.add_argument(
            "json_path", type=str, help="the path to the JSON file to be read"
        )

    def handle(self, *args, **options):
        filename = options["json_path"]
        courses = []
        get_datetime = lambda s: timezone.make_aware(timezone.datetime.fromisoformat(s))
        with open(filename) as jsonfile:
            obj = json.load(jsonfile)
            if not isinstance(obj, list):
                obj = [obj]
            try:
                with transaction.atomic():
                    for json_course in obj:
                        if Course.objects.filter(name=json_course["name"]).count() > 0:
                            self.stdout.write(
                                "Already created course {}".format(json_course["name"])
                            )
                            continue
                        course = Course.objects.create(
                            name=json_course["name"],
                            valid_until=get_datetime(json_course["valid_until"]),
                            enrollment_start=get_datetime(
                                json_course["enrollment_start"]
                            ),
                            enrollment_end=get_datetime(json_course["enrollment_end"]),
                        )
                        courses.append(course)
            except IntegrityError as e:
                self.stderr.write(
                    "Failed after generating these courses: {}".format(courses)
                )
                raise e
        self.stdout.write("Generated these courses: {}".format(courses))
