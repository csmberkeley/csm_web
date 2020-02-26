"""
Makes sure nothing in the system is overly screwed up.
"""

from django.core.management import BaseCommand
from scheduler.models import User, Mentor, Section, Spacetime
import datetime as dt


class Command(BaseCommand):
    help = "Runs through all objects in the database and makes sure nothing funky is up with them."

    failed = []

    def handle(self, *args, **options):
        self._check_section_integrities()
        self._check_profile_integries()
        if self.failed:
            self.stderr.write("Integrity check failed with these errors:")
            for f in self.failed:
                self.stderr.write(f)
            raise Exception()
        else:
            self.stdout.write("All clear. Hopefully. Good luck.")

    def _err(self, msg):
        # self.stderr.write(msg)
        self.failed.append(msg)

    def _check_profile_integries(self):
        """
        Makes sure no student has two profiles in the same course.
        """
        for user in User.objects.all():
            student_set = user.student_set
            if student_set.values("section__course").distinct().count() != student_set.count():
                self._err(f"User {user} had multiple Student profiles in same course: {student_set.all()}")

    def _check_section_integrities(self):
        """
        Makes sure that every single section has a mentor.
        Also makes sure no mentor teaches sections at overlapping times.
        """
        sections = Section.objects.all()
        for section in sections:
            if section.mentor is None:
                self._err(f"Section {section} has no mentor")

        mentors = Mentor.objects.select_related("section__spacetime")
        emails = mentors.values_list("user__email", flat=True).distinct()
        for email in emails:
            spacetimes = Spacetime.objects.filter(section__mentor__user__email=email)
            # Naive n^2 algorithm since n is almost certainly < 2
            for i, st in enumerate(spacetimes):
                st_start = dt.datetime.combine(dt.date.today(), st.start_time)
                st_end = st_start + st.duration
                for st_2 in spacetimes[i + 1:]:
                    st_2_start = dt.datetime.combine(dt.date.today(), st_2.start_time)
                    st_2_end = st_2_start + st_2.duration
                    if st_2_start <= st_start < st_2_end or st_2_start < st_end <= st_2_end:
                        self._err(f"Mentor {email} has overlapping sections at {st_2} and {st}")
