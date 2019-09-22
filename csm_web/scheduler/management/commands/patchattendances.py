from datetime import timedelta, date
from django.core.management import BaseCommand
from django.db import transaction
from scheduler.models import Student, Attendance, Spacetime

WEEKDAY_OFFSET = {
    pair[0]: number for number, pair in enumerate(Spacetime.DAY_OF_WEEK_CHOICES)
}


class Command(BaseCommand):
    help = "Creates a single attendance for this week for all students who have no attendances for this week."

    def handle(self, *args, **options):
        students = Student.objects.filter(active=True)
        with transaction.atomic():
            today = date.today()
            week_start = today - timedelta(days=today.weekday())
            week_end = week_start + timedelta(days=7)
            for student in students:
                if Attendance.objects.filter(student=student, date__range=(week_start, week_end)).count() > 0:
                    continue
                self.stdout.write(f"Updating {student} for week of {week_start}")
                Attendance.objects.create(
                    student=student,
                    date=week_start
                )
