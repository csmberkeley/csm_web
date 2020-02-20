from django.utils import timezone
from django.core.management import BaseCommand
from scheduler.models import Student, Attendance, week_bounds


class Command(BaseCommand):
    help = "Creates a single attendance for this week for all students who have no attendances for this week."

    def handle(self, *args, **options):
        week_start, week_end = week_bounds(timezone.now().date())
        students = Student.objects.filter(active=True).select_related(
            "section__course", "user") .exclude(attendance__date__range=(week_start, week_end))
        # Note that bulk_create can only set the primary key in Postgres, so this won't work as expected in development if using Sqlite
        print(f"Updating attendance for week of {week_start}")
        print('\n'.join(map(str, students)))
        Attendance.objects.bulk_create(Attendance(student=student, date=week_start) for student in students)
