import enum
import logging

from django.db import transaction
from django.utils.timezone import datetime
from django_q.models import Schedule
from django_q.tasks import schedule
from scheduler.models import Worksheet

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class WorksheetType(enum.StrEnum):
    WORKSHEET = "worksheet"
    SOLUTION = "solution"


@transaction.atomic
def publish_worksheet(worksheet_id: int, worksheet_type: WorksheetType):
    """
    Task to publish a given worksheet.

    Additionally, updates the worksheet model to reflect the now passed schedule time,
    setting the corresponding schedule field to None.
    """

    logger.info(
        "<publish_worksheet> Publishing the %s file for id %d",
        worksheet_type,
        worksheet_id,
    )

    # to make a worksheet file public, all we need to do is clear the associated schedule
    # from the worksheet object.
    try:
        worksheet = Worksheet.objects.get(id=worksheet_id)

        if worksheet_type == WorksheetType.WORKSHEET:
            worksheet.worksheet_schedule = None
        elif worksheet_type == WorksheetType.SOLUTION:
            worksheet.solution_schedule = None

        worksheet.save()
    except Worksheet.DoesNotExist:
        logger.error(
            "<publish_worksheet> Worksheet with id %d not found! Skipping scheduled task.",
            worksheet_id,
        )


def _get_task_id(worksheet_id: int, worksheet_type: WorksheetType):
    return f"publish_worksheet_{worksheet_id}_{worksheet_type}"


@transaction.atomic
def update_schedule(
    worksheet: Worksheet, worksheet_type: WorksheetType, new_schedule: datetime
):
    """
    Update the specified worksheet file's schedule to match the new scheduled datetime.
    Assumes that the datetime is timezone-aware; otherwise the scheduled date may not match
    the intended datetime, as the database operates in PST.

    This creates scheduled tasks as needed, and updates any previously scheduled tasks as well.

    This method is atomic; any failures to create schedules or update models
    will rollback all updates made here.
    """

    # update the worksheet model
    if worksheet_type == WorksheetType.WORKSHEET:
        worksheet.worksheet_schedule = new_schedule
    elif worksheet_type == WorksheetType.SOLUTION:
        worksheet.solution_schedule = new_schedule
    worksheet.save()

    # update the scheduled task
    task_id = _get_task_id(worksheet.id, worksheet_type)
    existing_schedule_qs = Schedule.objects.filter(name=task_id)
    if existing_schedule_qs.exists():
        assert (
            existing_schedule_qs.count() == 1
        ), f"More than one schedule exists for task {task_id}!"
        existing_schedule = existing_schedule_qs.get()

        # update the existing schedule
        existing_schedule.next_run = new_schedule
        existing_schedule.save()
    else:
        # no prior schedule, so create one
        schedule(
            "scheduler.tasks.schedule_resource.publish_worksheet",
            # args to the task
            worksheet.id,
            worksheet_type.value,
            # kwargs for the schedule
            name=task_id,
            schedule_type=Schedule.ONCE,
            next_run=new_schedule,
        )


@transaction.atomic
def clear_schedule(worksheet: Worksheet, worksheet_type: WorksheetType):
    """
    Remove any existing schedule for the specified worksheet file;
    this deletes any pending scheduled tasks as well.

    This method is atomic; any failures to create schedules or update models
    will rollback all updates made here.
    """
    # update the worksheet model
    if worksheet_type == WorksheetType.WORKSHEET:
        worksheet.worksheet_schedule = None
    elif worksheet_type == WorksheetType.SOLUTION:
        worksheet.solution_schedule = None
    worksheet.save()

    # delete the scheduled task (if it exists)
    # this will also delete any duplicates, though there should not be any to begin with.
    task_id = _get_task_id(worksheet.id, worksheet_type)
    existing_schedule_qs = Schedule.objects.filter(name=task_id)
    if existing_schedule_qs.exists():
        existing_schedule_qs.delete()
