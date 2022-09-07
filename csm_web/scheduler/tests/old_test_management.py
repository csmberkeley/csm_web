"""
Tests for management commands.
https://docs.djangoproject.com/en/3.0/topics/testing/tools/#topics-testing-management-commands
"""
from io import StringIO
from django.core.management import call_command
from django.test import TestCase
from scheduler.factories import (
    UserFactory,
    CourseFactory,
    MentorFactory,
    SectionFactory,
    StudentFactory
)


class TestSanity(TestCase):
    """
    These tests just make sure that the command does not fail due to schema changes that weren't
    accounted for.
    """
    # (name, args) tuples
    COMMANDS = (
        # ("checkintegrity", []), # Factories need updating to account for spacetime overlaps
        # ("export_attendances", ["CS61A"]),
        # ("export_course", ["CS61A"]),
        # ("export_section", ["demo_user@berkeley.edu"]),
        # ("triagedups", ["CS61A"]),
    )

    def setUp(self):
        self.cs61a = CourseFactory.create(name="CS61A")
        self.user = UserFactory.create(email="demo_user@berkeley.edu")
        mentor = MentorFactory.create(user=self.user)
        SectionFactory.create(course=self.cs61a, mentor=mentor)
        # Create a bunch of random guys for the heck of it
        for section in SectionFactory.create_batch(10, course=self.cs61a):
            StudentFactory.create(section=section)

    def test_commands(self):
        for name, args in TestSanity.COMMANDS:
            out = StringIO()
            call_command(name, *args, stdout=out)
