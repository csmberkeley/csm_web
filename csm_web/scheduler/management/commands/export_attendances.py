import csv
from django.core.management import BaseCommand
from scheduler.models import Course, Attendance


class Command(BaseCommand):
    help = "Exports a CSV of all attendances for all students in the given course to stdout."
    COLS = (
        "Student Name",
        "Student Email",
        "Attendance Date",
        "Attendance",
        "Mentor Name",
        "Mentor Email",
        "Section Day(s)",
        "Section Time(s)",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.csvwriter = csv.writer(self.stdout, dialect='unix', quoting=csv.QUOTE_MINIMAL)

    def add_arguments(self, parser):
        parser.add_argument("course", type=str, help="the name of the course")

    def handle(self, *args, **options):
        course = Course.objects.get(name=options["course"].upper())
        attendances = Attendance.objects.filter(student__active=True, student__section__course=course).select_related(
            'student__user', 'student__section__mentor').prefetch_related(
            'student__section__spacetimes').order_by("student__pk", "student__section__spacetimes__day_of_week",
                                                     "student__section__spacetimes__start_time",
                                                     "student__section__mentor")
        # Write headers
        self._write(self.COLS)
        for attendance in attendances:
            student = attendance.student
            section = student.section
            mentor = section.mentor
            spacetimes = list(section.spacetimes.all())
            row = (
                student.user.get_full_name(),
                student.user.email,
                str(attendance.date),
                attendance.get_presence_display(),
                mentor.user.get_full_name(),
                mentor.user.email,
                '|'.join(s.day_of_week for s in spacetimes),
                '|'.join(str(s.start_time) for s in spacetimes),
            )
            self._write(row)

    def _write(self, row):
        self.csvwriter.writerow(row)
