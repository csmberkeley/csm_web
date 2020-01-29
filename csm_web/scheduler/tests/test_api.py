from datetime import timedelta, time, datetime
from rest_framework import status
from rest_framework.test import APITestCase
from scheduler.models import Spacetime
from scheduler.factories import (
    SpacetimeFactory,
    CourseFactory,
    SectionFactory,
    StudentFactory,
    MentorFactory,
    OverrideFactory,
    UserFactory
)


class ProfileListTest(APITestCase):
    endpoint = '/api/profiles/'

    def setUp(self):
        self.user = UserFactory.create()
        self.client.force_authenticate(user=self.user)

    def test_simple_mentor(self):
        mentor = MentorFactory.create(user=self.user)
        section = SectionFactory.create(mentor=mentor, course=CourseFactory.create(name='CS61C', title='Machine Structures'),
                                        spacetime=SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1), location='Soda 1337'))
        response = self.client.get(self.endpoint)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0], {'id': mentor.pk, 'section_id': section.pk, 'section_spacetime': {'id': section.spacetime.pk, 'time': 'Monday 1:00-2:00 PM', 'location': 'Soda 1337'},
                                            'course': 'CS61C', 'course_title': 'Machine Structures', 'is_student': False})

    def test_simple_student(self):
        section = SectionFactory.create(course=CourseFactory.create(name='CS61C', title='Machine Structures'),
                                        spacetime=SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1), location='Soda 1337'))
        student = StudentFactory.create(user=self.user, section=section)
        response = self.client.get(self.endpoint)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0], {'id': student.pk, 'section_id': section.pk, 'section_spacetime': {'id': section.spacetime.pk, 'time': 'Monday 1:00-2:00 PM', 'location': 'Soda 1337'},
                                            'course': 'CS61C', 'course_title': 'Machine Structures', 'is_student': True})

    def test_mentor_and_student(self):
        student_section = SectionFactory.create(course=CourseFactory.create(name='CS61C', title='Machine Structures'),
                                                spacetime=SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1), location='Soda 1337'))
        student = StudentFactory.create(user=self.user, section=student_section)
        mentor = MentorFactory.create(user=self.user)
        mentor_section = SectionFactory.create(mentor=mentor, course=CourseFactory.create(name='CS70', title='Discrete Mathematics and Probability Theory'),
                                               spacetime=SpacetimeFactory.create(start_time=time(hour=11), day_of_week='Tue', duration=timedelta(hours=1.5), location='Cory 7'))
        response = self.client.get(self.endpoint)
        self.assertEqual(len(response.data), 2)
        self.assertTrue({'id': student.pk, 'section_id': student_section.pk, 'section_spacetime': {'id': student_section.spacetime.pk, 'time': 'Monday 1:00-2:00 PM', 'location': 'Soda 1337'},
                         'course': 'CS61C', 'course_title': 'Machine Structures', 'is_student': True} in response.data)
        self.assertTrue({'id': mentor.pk, 'section_id': mentor_section.pk, 'section_spacetime': {'id': mentor_section.spacetime.pk, 'time': 'Tuesday 11:00-12:30 PM', 'location': 'Cory 7'},
                         'course': 'CS70', 'course_title': 'Discrete Mathematics and Probability Theory', 'is_student': False} in response.data)

    def test_inactive_student(self):
        section = SectionFactory.create(course=CourseFactory.create(name='CS61C', title='Machine Structures'),
                                        spacetime=SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1)))
        StudentFactory.create(user=self.user, section=section, active=False)
        response = self.client.get(self.endpoint)
        self.assertEqual(len(response.data), 0)


class SpacetimeModifyTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        self.client.force_authenticate(user=self.user)

    def test_simple(self):
        mentor = MentorFactory.create(user=self.user)
        spacetime = SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1))
        SectionFactory.create(mentor=mentor, course=CourseFactory.create(
            name='CS61C', title='Machine Structures'), spacetime=spacetime)
        new_time = time(hour=12)
        new_day = 'Tue'
        new_location = 'New Location!'
        response = self.client.put(f"/api/spacetimes/{spacetime.pk}/modify/", {
            "start_time": new_time,
            "day_of_week": new_day,
            "location": new_location,
        })
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.data)
        new_spacetime = Spacetime.objects.get(pk=spacetime.pk)
        self.assertEqual(new_spacetime.start_time, new_time)
        self.assertEqual(new_spacetime.location, new_location)
        self.assertEqual(new_spacetime.day_of_week, new_day)


class OverrideTest(APITestCase):
    def setUp(self):
        self.user = UserFactory.create()
        section = SectionFactory.create(mentor=MentorFactory.create(user=self.user), course=CourseFactory.create())
        self.client.force_authenticate(user=self.user)
        self.spacetime = section.spacetime

    def test_create_override(self):
        override_time = time(hour=12)
        override_date = (datetime.now() + timedelta(days=1)).date()
        override_location = 'Soda 1337'
        data = {"start_time": override_time.strftime(
            "%H:%M:%S"), "date": override_date.isoformat(), "location": override_location}
        response = self.client.put(f"/api/spacetimes/{self.spacetime.pk}/override/", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.spacetime.refresh_from_db()
        self.assertIsNotNone(self.spacetime.override)
        self.assertEqual(override_time, self.spacetime.override.spacetime.start_time)
        self.assertEqual(override_date, self.spacetime.override.date)
        self.assertEqual(override_location, self.spacetime.override.spacetime.location)
        self.assertEqual(self.spacetime.duration, self.spacetime.override.spacetime.duration)

    def test_update_override(self):
        OverrideFactory.create(overriden_spacetime=self.spacetime)
        self.spacetime.refresh_from_db()
        self.assertIsNotNone(self.spacetime.override)
        override_time = time(hour=12)
        override_date = (datetime.now() + timedelta(days=1)).date()
        override_location = 'Soda 1337'
        data = {"start_time": override_time.strftime(
            "%H:%M:%S"), "date": override_date.isoformat(), "location": override_location}
        response = self.client.put(f"/api/spacetimes/{self.spacetime.pk}/override/", data, format='json')
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.data)
        self.spacetime.refresh_from_db()
        self.assertEqual(override_time, self.spacetime.override.spacetime.start_time)
        self.assertEqual(override_date, self.spacetime.override.date)
        self.assertEqual(override_location, self.spacetime.override.spacetime.location)
        self.assertEqual(self.spacetime.duration, self.spacetime.override.spacetime.duration)
