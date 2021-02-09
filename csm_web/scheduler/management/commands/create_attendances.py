from django.utils import timezone
from django.core.management import BaseCommand
from scheduler.models import Student, Attendance, week_bounds, day_to_number
from psqlextra.util import postgres_manager
from psqlextra.types import ConflictAction
from datetime import timedelta


class Command(BaseCommand):
    help = "Creates attendances for the current week"

    def handle(self, *args, **options):
        week_start, _ = week_bounds(timezone.now().date())
        students = Student.objects.filter(active=True).prefetch_related("section__spacetimes")
        print(f"Updating attendance for week of {week_start}")
        attendances = [{"date": week_start + timedelta(days=day_to_number(spacetime.day_of_week)),
                        "student": student, "presence": ""}
                       for student in students for spacetime in student.section.spacetimes.all()]
        with postgres_manager(Attendance) as manager:
            num_created = len(manager.on_conflict(["date", "student"], ConflictAction.NOTHING).bulk_insert(attendances))
            print(f"{num_created} attendances created")
