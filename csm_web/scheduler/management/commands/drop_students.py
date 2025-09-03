import csv

from django.core.management import BaseCommand
from django.db.models import Q
from django.utils import timezone
from scheduler.models import Attendance, Student

EMAIL_COL_TITLE = "Student Email"
COURSE_COL_TITLE = "Course"


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument(
            "csv_path", type=str, help="the path to the csv file to be read"
        )

    def handle(self, *args, **options):
        filename = options["csv_path"]
        with open(filename, "r", encoding="utf-8-sig") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                email = row[EMAIL_COL_TITLE]
                course = row[COURSE_COL_TITLE]
                print(email, course)
                try:
                    student = Student.objects.get(
                        user__email=email, section__mentor__course__name=course
                    )
                except Student.DoesNotExist:
                    continue
                student.active = False
                now = timezone.now().astimezone(timezone.get_default_timezone())
                student.attendance_set.filter(
                    Q(
                        sectionOccurrence__date__gte=now.date(),
                        sectionOccurrence__section=student.section,
                    )
                ).delete()
                student.save()
