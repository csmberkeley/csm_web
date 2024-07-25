import logging
from datetime import timedelta

from django.core.management import BaseCommand
from django.utils import timezone
from django_q.tasks import Schedule, schedule

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class Command(BaseCommand):
    help = (
        "Creates the schedule instance for attendances, expected to run every Monday at"
        " 1AM PST."
    )

    def handle(self, *args, **kwargs):
        now = timezone.now().astimezone(timezone.get_default_timezone())

        # run at 1AM on Mondays; if this is in the past, it'll trigger immediately,
        # which is okay (and usually desired)
        run_time = now - timedelta(days=now.weekday())
        run_time = run_time.replace(hour=1, minute=0, second=0, microsecond=0)

        # ensure that no other schedules have been created
        schedule_qs = Schedule.objects.filter(name="create_attendances")
        if schedule_qs.exists():
            existing_schedule = schedule_qs.first()
            raise RuntimeError(
                "Another schedule for attendance creation already exists!"
                f" (id {existing_schedule.id})"
            )

        schedule(
            func="scheduler.tasks.create_attendances.create_attendances",
            name="create_attendances",
            schedule_type=Schedule.WEEKLY,
            next_run=run_time,
            intended_date_kwarg="run_time_str",
        )

        logger.info(
            "Successfully scheduled attendance creation, starting at %s", run_time
        )
