from django.utils import timezone
from django.core.management import BaseCommand
from scheduler.models import Attendance, SectionOccurrence, Section, week_bounds, day_to_number
from psqlextra.util import postgres_manager
from psqlextra.types import ConflictAction
from datetime import timedelta


class Command(BaseCommand):
    help = "Creates attendances for the current week"

    def handle(self, *args, **options):
        week_start, _ = week_bounds(timezone.now().date())
        sections = Section.objects.all()
        print(f"Updating attendance for week of {week_start}")
        with postgres_manager(SectionOccurrence) as so_db, postgres_manager(Attendance) as attend_db:
            so_manager = so_db.on_conflict(["date", "section"], ConflictAction.NOTHING)
            attendance_manager = attend_db.on_conflict(["sectionOccurrence", "student"], ConflictAction.NOTHING)

            sos = [{"date": week_start + timedelta(days=day_to_number(spacetime.day_of_week)),
                    "section": section} for section in sections for spacetime in section.spacetimes.all()]
            sos = so_manager.bulk_insert(sos, return_model=True)
            print(f"Inserted {len(sos)} SectionOccurrences.")

            attendances = [{"student": student, "sectionOccurrence": so, "presence": ''}
                           for so in sos for student in so.section.students.all()]
            if attendances:
                inserted = attendance_manager.bulk_insert(attendances)
                print(f"Inserted {len(inserted)} attendances.")
            else:
                print("No attendances to insert.")
