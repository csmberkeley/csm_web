import csv
import datetime as dt
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import Profile, Section, User, Spacetime, Course


DAY_MAP = {  # one more copy/paste of this dict for the road
    "Monday": Spacetime.MONDAY,
    "Tuesday": Spacetime.TUESDAY,
    "Wednesday": Spacetime.WEDNESDAY,
    "Thursday": Spacetime.THURSDAY,
    "Friday": Spacetime.FRIDAY,
}


class Command(BaseCommand):
    help = "Import CS61A sections because their format is also slightly different. I swear this is the last one of these commands I'm making."

    def add_arguments(self, parser):
        parser.add_argument(
            "research_sections",
            type=str,
            help="the path to the CSV file for research sections (cap 0)",
        )
        parser.add_argument(
            "normal_sections",
            type=str,
            help="the path to the CSV file for non-research sections (cap 4)",
        )

    gmails = []

    def handle(self, *args, **options):
        research = options["research_sections"]
        normal = options["normal_sections"]
        course = Course.objects.get(name="CS61A")
        with transaction.atomic():
            # maps (mentor email, room, time, day): (section object, mentor profile)
            # (all fields in tuple are strings)
            research_map = {}
            with open(research) as csvfile:
                reader = iter(csv.reader(csvfile))
                next(reader)
                for row in reader:
                    self._enroll_and_make_section(row, course, research_map, 0)
            normal_map = {}
            with open(normal) as csvfile:
                reader = iter(csv.reader(csvfile))
                next(reader)
                for row in reader:
                    self._enroll_and_make_section(row, course, normal_map, 4)
            dups = normal_map.keys() & research_map.keys()
            if dups:
                self.stderr.write("Found these apparent duplicate sections:")
                for dup in dups:
                    self.stderr.write(dups)
                raise Exception()
            if self.gmails:
                self.stderr.write(
                    "These accounts signed up with Berkeley emails and must be manually enrolled later"
                )
                for g in self.gmails:
                    self.stderr.write(g)
        self.stderr.write("Done.")

    def _enroll_and_make_section(self, row, course, section_map, capacity):
        stud_f_name, stud_l_name, stud_email, _, mentor_email, room, time_str, day = row
        section_key = (mentor_email, room, time_str, day)
        start_time = dt.time.fromisoformat(time_str)
        if section_key not in section_map:
            # Create section
            spacetime = Spacetime.objects.create(
                location=room,
                start_time=start_time,
                duration=dt.timedelta(hours=1),
                day_of_week=DAY_MAP[day],
            )
            section = Section.objects.create(
                course=course, default_spacetime=spacetime, capacity=capacity
            )
            chunks = mentor_email.split("@")
            if len(chunks) != 2:
                raise Exception("Malformed email: {}".format(mentor_email))
            if chunks[1] != "berkeley.edu":
                self.gmails.append(mentor_email)
                return
            user, _ = User.objects.get_or_create(username=chunks[0], email=mentor_email)
            mentor = Profile.objects.create(user=user, course=course, section=section)
            # Need to run createghostprofiles after
            section_map[section_key] = (section, mentor)
        section, mentor = section_map[section_key]
        # Create students
        if not stud_email.strip():
            return
        chunks = stud_email.split("@")
        if len(chunks) != 2:
            raise Exception("Malformed email: {}".format(stud_email))
        if chunks[1] != "berkeley.edu":
            self.gmails.append(stud_email)
            return
        user, _ = User.objects.get_or_create(username=chunks[0], email=stud_email)
        if not user.first_name and not user.last_name:
            user.first_name = stud_f_name
            user.last_name = stud_l_name
            user.save()
        Profile.objects.create(
            course=course,
            leader=mentor,
            role=Profile.STUDENT,
            user=user,
            section=section,
        )
