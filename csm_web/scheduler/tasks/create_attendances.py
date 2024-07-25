import logging
from datetime import datetime, timedelta
from typing import Optional

from django.db import Error, transaction
from django.utils import timezone
from scheduler.models import (
    Attendance,
    Section,
    SectionOccurrence,
    day_to_number,
    week_bounds,
)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def create_attendances(run_time_str: Optional[str] = None):
    """
    Create section occurrences and attendances for the current week,
    relative to either `run_time` (the intended schedule run time)
    or relative to the current execution time, if no `run_time` is provided.
    """

    if run_time_str is None:
        # default to the current execution time if no intended run time is provided
        run_time = timezone.now().astimezone(timezone.get_default_timezone())
    else:
        run_time = datetime.fromisoformat(run_time_str)

    week_start, _ = week_bounds(run_time.date())
    sections = Section.objects.all()

    logger.info("<create_attendances> Updating attendance for week of %s", week_start)

    with transaction.atomic():
        section_occurrences = [
            {
                "date": week_start
                + timedelta(days=day_to_number(spacetime.day_of_week)),
                "section": section,
            }
            for section in sections
            for spacetime in section.spacetimes.all()
        ]
        section_occurrence_models = []  # list of section occurrence models
        for section_occurrence in section_occurrences:
            section = section_occurrence["section"]
            date = section_occurrence["date"]
            if date < section.mentor.course.section_start:
                # skip section occurrence if it's before section start date
                continue
            try:
                cur, _ = SectionOccurrence.objects.get_or_create(**section_occurrence)
                section_occurrence_models.append(cur)
            except Error as e:
                logger.error(
                    "<create_attendances> Failed to save %s; %s", section_occurrence, e
                )

        logger.info(
            "<create_attendances> Inserted %d SectionOccurrences.",
            len(section_occurrence_models),
        )

        attendances = [
            {"student": student, "sectionOccurrence": so}
            for so in section_occurrence_models
            for student in so.section.students.filter(active=True)
        ]

        # validate attendances
        valid = True
        for attendance in attendances:
            student = attendance.get("student")
            section_occurrence = attendance.get("sectionOccurrence")
            if student and section_occurrence:
                if student.section.pk != section_occurrence.section.pk:
                    valid = False
                    logger.error(
                        "<create_attendances> student.section.pk != SO.section.pk,"
                        " attendance to add: %s",
                        attendances,
                    )
                    break

        if attendances and valid:
            for attendance in attendances:
                try:
                    Attendance.objects.get_or_create(**attendance)
                except Error as e:
                    logger.error(
                        "<create_attendances> Failed to save %s; %s", attendance, e
                    )

            logger.info(
                "<create_attendances> Inserted %d attendances.", len(attendances)
            )
        else:
            logger.info("<create_attendances> No attendances to insert or error.")
