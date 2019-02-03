import csv
import os
from django.core.management import call_command
from django.test import TestCase
import scheduler.factories as factories
from scheduler.models import User, Profile, Course
from scheduler.management.commands.createghostprofiles import (
    PROFILE_CSV_DEFAULT_FIELDS as PROFILE_FIELD_ORDER,
)


class TestGhostProfileMaker(TestCase):
    """
	Tests functionality of the createghostprofiles management command.
	"""

    NUM_STUDENTS = 500
    TEST_COURSE = "EE16A"

    @classmethod
    def setUpTestData(cls):
        c = factories.CourseFactory.create(name=cls.TEST_COURSE)
        # not using ProfileFactory, because of some weird recursion depth exceeded error
        profiles = []
        for _ in range(cls.NUM_STUDENTS):
            profiles.append(
                Profile(
                    leader=None,
                    course=c,
                    role=Profile.STUDENT,
                    user=factories.UserFactory.create(),
                    section=None,
                )
            )
        profile_dicts = []

        def make_test_csvs(filenames, headers):
            assert len(filenames) == len(headers)
            fs = [open(filename, "x") for filename in filenames]
            ws = [csv.writer(f) for f in fs]
            for i in range(len(ws)):
                if headers[i]:
                    ws[i].writerow(headers[i])
            for profile in profiles:
                # avoid saving to db with build instead of create
                profile_dict = {
                    "name": profile.user.get_full_name(),
                    "email": profile.user.email,
                    "role": profile.role,
                }
                profile_dicts.append(profile_dict)
                line = [
                    e
                    for e in map(profile_dict.get, PROFILE_FIELD_ORDER)
                    if e is not None
                ]
                [w.writerow(line) for w in ws]
            [f.close() for f in fs]

        no_header = "no_header_profiles.csv"
        with_header = "with_header_profiles.csv"
        make_test_csvs([no_header, with_header], [(), PROFILE_FIELD_ORDER])
        cls.profile_dicts = profile_dicts
        cls.no_header_filename = no_header
        cls.with_header_filename = with_header
        cls._f = [open(no_header, "r"), open(with_header, "r")]

    @classmethod
    def tearDownClass(cls):
        [f.close() for f in cls._f]
        [os.remove(f.name) for f in cls._f]

    def test_success_command_output(self):
        course = self.TEST_COURSE
        self.assertEqual(course, Course.objects.all().first().name)

        def check():
            for profile_dict in self.profile_dicts:
                # check to ensure that the users all exist
                user = User.objects.get(email=profile_dict["email"])
                # assume only one profile per user created
                profile = Profile.objects.get(user=user)
                self.assertEqual(course, profile.course.name)
                self.assertEqual(profile_dict["role"], profile.role)
            self.assertEqual(self.NUM_STUDENTS, Profile.objects.count())

        call_command("createghostprofiles", self.no_header_filename, course)
        check()
        Profile.objects.all().delete()
        User.objects.all().delete()
        call_command(
            "createghostprofiles", self.with_header_filename, course, "--nullsections"
        )
        check()
