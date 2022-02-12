from django.utils import timezone
from django.core.management import BaseCommand
from scheduler.models import Attendance, SectionOccurrence, Section, week_bounds, day_to_number
from psqlextra.util import postgres_manager
from psqlextra.types import ConflictAction
from datetime import timedelta
import logging
from django.db import transaction, Error


logger = logging.getLogger(__name__)
logger.info = logger.warning


class Command(BaseCommand):
    help = "Creates attendances for the current week"

    def handle(self, *args, **options):
        now = timezone.now().astimezone(timezone.get_default_timezone())
        week_start, _ = week_bounds(now.date())
        sections = Section.objects.all()
        logger.info(f"Updating attendance for week of {week_start}")
        with transaction.atomic():
            # with postgres_manager(SectionOccurrence) as so_db:
            #     so_manager = so_db.on_conflict(["date", "section"], ConflictAction.NOTHING)

            sos = [{"date": week_start + timedelta(days=day_to_number(spacetime.day_of_week)),
                    "section": section} for section in sections for spacetime in section.spacetimes.all()]
            sos_models = []  # list of section occurrence models
            for so in sos:
                try:
                    cur, _ = SectionOccurrence.objects.get_or_create(**so)
                    sos_models.append(cur)
                except Error as e:
                    logger.error("<Logging> Failed to save {so};", e)
            # sos = so_manager.bulk_insert(sos, return_model=True)
            logger.info(f"Inserted {len(sos_models)} SectionOccurrences.")

            # with postgres_manager(Attendance) as attend_db:
            #     attendance_manager = attend_db.on_conflict(["sectionOccurrence", "student"], ConflictAction.NOTHING)
            attendances = [{"student": student, "sectionOccurrence": so}
                           for so in sos_models for student in so.section.students.filter(active=True)]

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
                for attendance in attendances:
                    try:
                        Attendance.objects.get_or_create(**attendance)
                    except Error as e:
                        logger.error("<Logging> Failed to save {attendance};", e)
                # inserted = attendance_manager.bulk_insert(attendances)

                logger.info(f"Inserted {len(attendances)} attendances.")
            else:
                logger.info("No attendances to insert or error.")
