import csv
from django.core.management import BaseCommand
from scheduler.models import Student, Attendance
from .utils import log_str, logger

EMAIL_COL_TITLE = "Student Email"
COURSE_COL_TITLE = "Course"


class Command(Base):

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="the path to the csv file to be read")

    def handle(self, *args, **options):
        filename = options["csv_path"]
        with open(filename, "r") as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                email = row[EMAIL_COL_TITLE]
                course = row[COURSE_COL_TITLE]
                student = Student.objects.get(email=email, section__mentor__course=course)
                student.active = False
                student.attendance_set.filter(
                    Q(
                        sectionOccurrence__date__gte=now.date(),
                        sectionOccurrence__section=student.section,
                    )
                ).delete()
                student.save()
