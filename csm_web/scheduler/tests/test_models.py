from django.test import TestCase
from rest_framework.serializers import ValidationError
from datetime import datetime, timedelta
from scheduler.models import Override, Spacetime
from scheduler.factories import (
    SpacetimeFactory,
    OverrideFactory,
    CourseFactory,
    SectionFactory,
)


class SpacetimeTest(TestCase):
    def setUp(self):
        course = CourseFactory.create()
        self.section = SectionFactory.create(course=course)
        self.spacetime = SpacetimeFactory.create(section=self.section)

    def test_spacetime_without_override(self):
        self.assertIsNone(self.spacetime.override)

    def test_spacetime_with_override(self):
        override = OverrideFactory.create(overriden_spacetime=self.spacetime)
        self.assertEqual(override, self.spacetime.override)

    def test_spacetime_with_expired_override(self):
        date = datetime.now() - timedelta(days=5)
        override = OverrideFactory.create(
            overriden_spacetime=self.spacetime,
            date=date,
            spacetime=SpacetimeFactory.create(day_of_week=Spacetime.DayOfWeek.values[date.weekday()])
        )
        self.assertTrue(override.is_expired())
        self.assertIsNone(self.spacetime.override)

    def test_location_normalization(self):
        spacetime = SpacetimeFactory.create(location='  Soda     372 ', section=self.section)
        self.assertEqual(spacetime.location, 'Soda 372')


class CourseTest(TestCase):
    def test_enrollment_start_after_end_validation(self):
        with self.assertRaises(ValidationError):
            CourseFactory.create(
                enrollment_start=datetime.now(),
                enrollment_end=(datetime.now() - timedelta(days=1)),
                valid_until=(datetime.now() + timedelta(days=10)),
            )

    def test_valid_until_after_enrollment(self):
        with self.assertRaises(ValidationError):
            CourseFactory.create(
                enrollment_start=datetime.now(),
                enrollment_end=(datetime.now() + timedelta(days=1)),
                valid_until=(datetime.now() - timedelta(days=10)),
            )


class OverrideTest(TestCase):
    def setUp(self):
        course = CourseFactory.create()
        self.section = SectionFactory.create(course=course)
        self.spacetime = SpacetimeFactory.create(section=self.section)

    def test_spacetime_override_self_validation(self):
        with self.assertRaises(ValidationError):
            Override.objects.create(spacetime=self.spacetime,
                                    overriden_spacetime=self.spacetime, date=datetime.now().date())

    def test_day_of_week_validation(self):
        override = OverrideFactory.create(overriden_spacetime=self.spacetime)
        with self.assertRaises(ValidationError):
            override.date -= timedelta(days=1)
            override.save()
