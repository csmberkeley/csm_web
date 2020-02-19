from datetime import timedelta, date
from django.core.management import BaseCommand
from scheduler.models import Student, Attendance


class Command(BaseCommand):
    help = "Creates a single attendance for this week for all students who have no attendances for this week."

    def handle(self, *args, **options):
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(weeks=1)
        students = Student.objects.filter(active=True).only(
            "id").exclude(attendance__date__range=(week_start, week_end))
        # Note that bulk_create can only set the primary key in Postgres, so this won't work as expected in development if using Sqlite
        Attendance.objects.bulk_create(Attendance(student=student, date=week_start) for student in students)
