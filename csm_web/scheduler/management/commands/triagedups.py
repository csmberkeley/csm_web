# Emergency triage script for removing duplicate sections.
from scheduler.models import *
from django.core.management import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("course_names", nargs="+")

    def handle(self, *args, **options):
        with transaction.atomic():
            self._fix_dups(options["course_names"])

    def _triage(self, tup):
        course, time, loc, day, email = tup
        profs = Profile.objects.filter(
            course=course,
            user__email=email,
            section__default_spacetime__start_time=time,
            section__default_spacetime__location=loc,
            section__default_spacetime__day_of_week=day,
        )
        profs = iter(profs)
        keep = next(profs)
        print("=========")
        print("Keeping {}".format(keep))
        for prof in profs:
            for s in prof.section.students:
                s.section = keep.section
                s.save()
            if len(prof.section.students) == 0:
                print("Deleting {}".format(prof))
                prof.section.delete()
            else:
                raise Exception("Section {} not cleared")
        print("Removed duplicates for section {}".format(keep))
        if keep.section.capacity < len(keep.section.students):
            print("Section {} overbooked :(".format(keep))

    def _fix_dups(self, course_names):
        for course_name in course_names:
            course = Course.objects.get(name=course_name)
            ss = Section.objects.filter(course=course)
            seen = set()
            dups = []
            for s in ss:
                st = s.default_spacetime
                obj = (
                    course,
                    st.start_time,
                    st.location,
                    st.day_of_week,
                    s.mentor.user.email,
                )
                if obj in seen:
                    dups.append(obj)
                seen.add(obj)
            for dup in dups:
                self._triage(dup)
