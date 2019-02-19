from datetime import timedelta, date
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import Profile, Attendance, Spacetime

WEEKDAY_MAP = {
    number: pair[0] for number, pair in enumerate(Spacetime.DAY_OF_WEEK_CHOICES)
}


class Command(BaseCommand):
    help = """Creates a single attendance for this week for all students who have no attendances for this week."""

    def handle(self, *args, **options):
        students = Profile.objects.filter(role=Profile.STUDENT, active=True)
        with transaction.atomic():
            for profile in students:
                section = profile.section
                # TODO skip to upcoming monday for jobs
                current_date = date.today()
                if (
                    Attendance.objects.filter(
                        section=section,
                        attendee=profile,
                        week_start=current_date
                        - timedelta(days=current_date.weekday()),
                    ).count()
                    > 0
                ):
                    # self.stdout.write("Skipping {}".format(profile))
                    continue
                self.stdout.write("Updating {}".format(profile))
                while (
                    WEEKDAY_MAP[current_date.weekday()]
                    != section.default_spacetime.day_of_week
                ):
                    current_date += timedelta(days=1)
                Attendance.objects.create(
                    attendee=profile,
                    section=profile.section,
                    week_start=current_date - timedelta(days=current_date.weekday()),
                )
