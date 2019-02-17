from datetime import timedelta
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import Profile, Attendance, Spacetime

WEEKDAY_MAP = {
    number: pair[0] for number, pair in enumerate(Spacetime.DAY_OF_WEEK_CHOICES)
}


class Command(BaseCommand):
    help = """Creates a single, temporary attendance for all students who have no attendances."""

    def handle(self, *args, **options):
        students = Profile.objects.filter(role=Profile.STUDENT, active=True)
        with transaction.atomic():
            for profile in students:
                section = profile.section
                if (
                    Attendance.objects.filter(section=section, attendee=profile).count()
                    > 0
                ):
                    # self.stdout.write("Skipping {}".format(profile))
                    continue
                self.stdout.write("Updating {}".format(profile))
                current_date = profile.course.enrollment_start.date()
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
