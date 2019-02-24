"""
Makes sure nothing in the system is overly screwed up.
"""

import csv
from django.core.management import BaseCommand
from scheduler.models import Course, Profile, Section, Spacetime, Attendance
import datetime as dt


class Command(BaseCommand):
    help = "Runs through all objects in the database and makes sure nothing funky is up with them."

    failed = []

    def add_arguments(self, parser):
        parser.add_argument(
            "courses",
            nargs="+",
            help="the courses that are expected to exist in the database",
        )
        parser.add_argument(
            "--omitfile",
            help="a CSV of courses/emails to be ommited from section signups, likely because the course is handling those signups itself",
        )

    def handle(self, *args, **options):
        self._check_courses(options["courses"])
        if options["omitfile"]:
            omits = self._get_omits(options["omitfile"])
            self._check_omits(omits)
        self._check_section_integrities(options["courses"])
        self._check_profile_integrities()
        self._check_attendance_integrities()
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

    def _get_omits(self, omitfile):
        omits = {}
        with open(omitfile) as csvfile:
            # assume no header
            reader = csv.reader(csvfile)
            for row in reader:
                course, email = row
                if course in omits:
                    omits[course].append(email)
                else:
                    omits[course] = [email]
        return omits

    def _check_courses(self, courses):
        """
        Makes sure that all the specified courses are in the database
        """
        for course_name in courses:
            count = Course.objects.filter(name=course_name).count()
            if count != 1:
                self._err("Found {} course instances of {}".format(count, course_name))

    def _check_omits(self, omits):
        """
        Makes sure that none of the sections or profiles in the omitfile were created.
        """
        for course_name in omits:
            course = Course.objects.get(name=course_name)
            emails = omits[course_name]
            for email in emails:
                profiles = Profile.objects.filter(course=course, user__email=email)
                if profiles.count() == 0:
                    continue
                self._err(
                    "Found {} profile instances for course {}, email {}".format(
                        profiles.count(), course, email
                    )
                )
                for profile in profiles:
                    section_count = Section.objects.filter(mentor=profile)
                    if section_count != 0:
                        self._err(
                            "Found {} section instances for profile {}".format(
                                section_count, profile
                            )
                        )

    def _check_section_integrities(self, courses):
        """
        Makes sure that every single section:
        - has a mentor
        - has < capacity students
        - has a course
        - has a spacetime
        """
        sections = Section.objects.all()
        seen_spacetimes = set()
        for section in sections:
            if section.course.name not in courses:
                self._err("Section {} has bad course".format(section))
            if section.course.name == "EE16A":
                if section.default_spacetime.duration < dt.timedelta(
                    hours=1, minutes=30
                ):
                    self._err("16A section {} has bad duration".format(section))
            if not section.capacity:
                self._err("Section {} lacks capacity".format(section))
            if section.current_student_count > section.capacity:
                self._err(
                    "Section {} is overbooked ({} out of {})".format(
                        section, section.current_student_count, section.capacity
                    )
                )
            if not section.default_spacetime:
                self._err("Section {} lacks spacetime".format(section))
            st = section.default_spacetime
            obj = (
                st.start_time,
                st.location,
                st.day_of_week,
                section.mentor.user.email,
            )
            if obj in seen_spacetimes:
                self._err(
                    "Duplicate spacetime for section {} by mentor {}".format(
                        section, section.mentor
                    )
                )
            seen_spacetimes.add(obj)
            if not section.mentor:
                self._err("Section {} lacks mentor".format(section))
            mentor_role = section.mentor.role
            if section.mentor.role == Profile.STUDENT:
                self._err(
                    "Somehow, mentor {} of section {} has role student".format(
                        section.mentor, section
                    )
                )

    def _check_profile_integrities(self):
        for profile in Profile.objects.all():
            if not profile.user:
                self._err("Somehow, profile {} has no user".format(profile))
            if profile.role not in Profile.ROLE_MAP:
                self._err("Profile {} has bad role".format(profile))
            if profile.role == Profile.STUDENT and not profile.section:
                self._err("Student profile {} has no section".format(profile))
            if profile.role == Profile.STUDENT and profile.active:
                if profile.leader != profile.section.leader:
                    self._err(
                        "Student profile {} has inconsistent leader".format(profile)
                    )

    def _check_attendance_integrities(self):
        qs = Attendance.objects.exclude(section=F("attendee__section"))
        if qs.count() > 0:
            self._err(
                "Found {} attendances where section does not match profile".format(
                    qs.count()
                )
            )
