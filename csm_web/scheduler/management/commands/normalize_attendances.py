from django.core.management import BaseCommand
from scheduler.models import Attendance, Student, Spacetime, day_to_number, week_bounds
from itertools import groupby
from django.db.models import Prefetch
from datetime import timedelta


class Command(BaseCommand):

    help = """Normalize attendances such that they fall on the same day of the week as the student's CURRENT section, and delete
attendances duplicated for the week resulting from students swapping sections in the same course,
so long as they aren't unexecused absences"""

    def handle(self, *args, **options):
        attendances_to_update = []
        for student in Student.objects.all().prefetch_related(
                Prefetch("section__spacetimes", queryset=Spacetime.objects.all().order_by(
                    "day_of_week").only("day_of_week")),
                Prefetch("attendance_set", queryset=Attendance.objects.all().order_by("date"))):
            days = student.section.spacetimes.values_list("day_of_week", flat=True)
            for _, attendances in groupby(student.attendance_set.all(), lambda attendance: week_bounds(attendance.date)):
                attendances = list(attendances)
                for attendance, day in zip(attendances, days):
                    if attendance.date.strftime("%A") != day:
                        if not any(attendance.date.strftime("%A") == day for attendance in attendances):
                            attendance.date = attendance.date + \
                                timedelta(days=day_to_number(day) - attendance.date.weekday())
                            attendances_to_update.append(attendance)
                        elif attendance.presence != Attendance.Presence.UNEXCUSED_ABSENCE:
                            attendance.delete()

        Attendance.objects.bulk_update(attendances_to_update, ("date",))
