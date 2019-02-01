from io import StringIO
import csv
from django.core.management import call_command
from django.test import TestCase
from tempfile import NamedTemporaryFile
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
    NUM_JMS = 100

    @classmethod
    def setUpTestData(cls):
        c = factories.CourseFactory.create(name="EE16A")
        mentor = Profile.objects.create(
            leader=None,
            course=c,
            role=Profile.JUNIOR_MENTOR,
            user=factories.UserFactory.create(),
            section=None,
        )
        # not using ProfileFactory, because of some weird recursion depth exceeded error
        profiles = []
        for i in range(cls.NUM_STUDENTS):
            profiles.append(
                Profile(
                    leader=mentor,
                    course=c,
                    role=Profile.STUDENT,
                    user=factories.UserFactory.create(),
                    section=None,
                )
            )
        profile_dicts = []
        f = NamedTemporaryFile(mode="w", prefix="good_profiles", suffix="csv")
        w = csv.writer(f)
        for profile in profiles:
            # avoid saving to db with build instead of create
            profile_dict = {
                "email": profile.user.email,
                "course": c,
                "role": profile.role,
            }
            profile_dicts.append(profile_dict)
            line = [
                e for e in map(profile_dict.get, PROFILE_FIELD_ORDER) if e is not None
            ]
            w.writerow(line)
        cls.good = {"filename": f.name, "profile_dicts": profile_dicts}
        cls.f = f

    @classmethod
    def tearDownClass(cls):
        cls.f.close()

    def test_success_command_output(self):
        course = "EE16A"
        call_command("createghostprofiles", self.good["filename"], "EE16A")
        missing = []
        for profile_dict in self.good["profile_dicts"]:
            # check to ensure that the users all exist
            user = User.objects.get(email=profile_dict["email"])
            # assume only one profile per user created
            try:
                profile = Profile.objects.get(user=user)
                self.assertEqual(course, profile.course.name)
                self.assertEqual(profile_dict["role"], profile.role)
            except Profile.DoesNotExist:
                missing += list(profile_dict.values())
