import logging
import secrets
from datetime import timedelta

from django.core.management import BaseCommand
from django.utils import timezone
from django_q.tasks import Schedule, schedule

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


class Command(BaseCommand):
    help = "Schedules a test task."

    def handle(self, *args, **kwargs):
        now = timezone.now().astimezone(timezone.get_default_timezone())
        run_time = now + timedelta(seconds=15)

        random_suffix = secrets.token_hex(8)

        schedule(
            func="scheduler.tasks.test_task.test_task",
            name=f"test_task_{random_suffix}",
            schedule_type=Schedule.ONCE,
            next_run=run_time,
            intended_date_kwarg="run_time_str",
        )

        logger.info("Successfully scheduled test task, starting at %s", run_time)
