from django.test import TestCase
from django.utils import timezone
from rest_framework.serializers import ValidationError
from datetime import datetime, timedelta
from scheduler.models import Override, Spacetime, Student, DayOfWeekField, week_bounds
from scheduler.factories import (
    SpacetimeFactory,
    OverrideFactory,
    CourseFactory,
    SectionFactory,
    UserFactory
)


class SpacetimeTest(TestCase):
    def setUp(self):
        course = CourseFactory.create()
        self.section = SectionFactory.create(course=course)
        self.spacetime = SpacetimeFactory.create(section=self.section)

    def test_spacetime_without_override(self):
        self.assertIsNone(self.spacetime.override)

    # def test_spacetime_with_override(self):
    #     override = OverrideFactory.create(overriden_spacetime=self.spacetime)
    #     self.assertEqual(override, self.spacetime.override)

    # def test_spacetime_with_expired_override(self):
    #     date = datetime.now() - timedelta(days=5)
    #     override = OverrideFactory.create(
    #         overriden_spacetime=self.spacetime,
    #         date=date,
    #         spacetime=SpacetimeFactory.create(day_of_week=DayOfWeekField.DAYS[date.weekday()])
    #     )
    #     self.assertTrue(override.is_expired())
    #     self.assertIsNone(self.spacetime.override)

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


# class OverrideTest(TestCase):
#     def setUp(self):
#         course = CourseFactory.create()
#         self.section = SectionFactory.create(course=course)
#         self.spacetime = SpacetimeFactory.create(section=self.section)

#     def test_spacetime_override_self_validation(self):
#         with self.assertRaises(ValidationError):
#             Override.objects.create(spacetime=self.spacetime,
#                                     overriden_spacetime=self.spacetime, date=datetime.now().date())

#     def test_day_of_week_validation(self):
#         override = OverrideFactory.create(overriden_spacetime=self.spacetime)
#         with self.assertRaises(ValidationError):
#             override.date -= timedelta(days=1)
#             override.save()


class StudentAttendanceTest(TestCase):
    """
    This test won't work on Sundays
    """

    def setUp(self):
        self.now = timezone.now()
        self.course = CourseFactory.create(enrollment_start=self.now - timedelta(weeks=1), enrollment_end=self.now +
                                           timedelta(weeks=3), section_start=(self.now - timedelta(days=self.now.weekday())).date())
        self.user = UserFactory.create()

    def test_section_later_in_week(self):
        section = SectionFactory.create(course=self.course, spacetimes=[SpacetimeFactory.create(
            day_of_week=DayOfWeekField.DAYS[self.now.weekday() + 1])])
        student = Student.objects.create(section=section, user=self.user)
        self.assertEqual(student.attendance_set.count(), 1)
        self.assertEqual(week_bounds(timezone.now().date()), week_bounds(student.attendance_set.first().date))

    def test_section_earlier_in_week(self):
        section = SectionFactory.create(course=self.course, spacetimes=[SpacetimeFactory.create(
            day_of_week=DayOfWeekField.DAYS[self.now.weekday() - 1])])
        student = Student.objects.create(section=section, user=self.user)
        self.assertFalse(student.attendance_set.exists())

    def test_attendance_already_exists(self):
        section = SectionFactory.create(course=self.course, spacetimes=[SpacetimeFactory.create(
            day_of_week=DayOfWeekField.DAYS[self.now.weekday() + 1])])
        student = Student.objects.create(section=section, user=self.user)
        self.assertEqual(student.attendance_set.count(), 1)
        new_section_later = SectionFactory.create(course=self.course, spacetimes=[SpacetimeFactory.create(
            day_of_week=DayOfWeekField.DAYS[self.now.weekday() + 2])])
        student.section = new_section_later
        student.save()
        student.refresh_from_db()
        self.assertEqual(student.attendance_set.count(), 1)
        new_section_earlier = SectionFactory.create(course=self.course, spacetimes=[SpacetimeFactory.create(
            day_of_week=DayOfWeekField.DAYS[self.now.weekday() - 1])])
        student.section = new_section_earlier
        student.save()
        self.assertEqual(student.attendance_set.count(), 1)

    def test_course_ended(self):
        self.course.enrollment_end = self.now - timedelta(days=2)
        self.course.valid_until = self.now - timedelta(days=1)
        self.course.save()
        section = SectionFactory.create(course=self.course, spacetimes=[SpacetimeFactory.create(
            day_of_week=DayOfWeekField.DAYS[self.now.weekday() + 1])])
        student = Student.objects.create(section=section, user=self.user)
        self.assertFalse(student.attendance_set.exists())
