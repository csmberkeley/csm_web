from django.utils import timezone
from django.core.management import BaseCommand
from scheduler.models import Attendance, SectionOccurrence, Section, week_bounds, day_to_number
from psqlextra.util import postgres_manager
from psqlextra.types import ConflictAction
from datetime import timedelta
import logging
from django.db import transaction


logger = logging.getLogger(__name__)
logger.info = logger.warn


class Command(BaseCommand):
    help = "Creates attendances for the current week"

    def handle(self, *args, **options):
        week_start, _ = week_bounds(timezone.now().date())
        sections = Section.objects.all()
        print(f"Updating attendance for week of {week_start}")
        with transaction.atomic():
            with postgres_manager(SectionOccurrence) as so_db:
                so_manager = so_db.on_conflict(["date", "section"], ConflictAction.NOTHING)

                sos = [{"date": week_start + timedelta(days=day_to_number(spacetime.day_of_week)),
                        "section": section} for section in sections for spacetime in section.spacetimes.all()]
                sos = so_manager.bulk_insert(sos, return_model=True)
                print(f"Inserted {len(sos)} SectionOccurrences.")

            with postgres_manager(Attendance) as attend_db:
                attendance_manager = attend_db.on_conflict(["sectionOccurrence", "student"], ConflictAction.NOTHING)
                attendances = [{"student": student, "sectionOccurrence": so, "presence": ''}
                               for so in sos for student in so.section.students.filter(active=True)]

                # validate attendances
                valid = True
                for attendance in attendances:
                    student = attendance.get("student")
                    SO = attendance.get("sectionOccurrence")
                    if student and SO:
                        if student.section.pk != SO.section.pk:
                            valid = False
                            logger.error(
                                f"<Logging> student.section.pk != SO.section.pk, attendance to add: {attendances}")
                            break

                if attendances and valid:
                    inserted = attendance_manager.bulk_insert(attendances)
                    print(f"Inserted {len(inserted)} attendances.")
                else:
                    print("No attendances to insert or error.")
