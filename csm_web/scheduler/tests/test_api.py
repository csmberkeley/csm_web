from datetime import timedelta, time
from rest_framework import status
from rest_framework.test import APITestCase
from scheduler.models import Spacetime
from scheduler.factories import (
    SpacetimeFactory,
    CourseFactory,
    SectionFactory,
    StudentFactory,
    MentorFactory,
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
                                        spacetime=SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1)))
        response = self.client.get(self.endpoint)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0], {'id': mentor.pk, 'section_id': section.pk, 'section_spacetime': 'Monday 1:00-2:00 PM',
                                            'course': 'CS61C', 'course_title': 'Machine Structures', 'is_student': False})

    def test_simple_student(self):
        section = SectionFactory.create(course=CourseFactory.create(name='CS61C', title='Machine Structures'),
                                        spacetime=SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1)))
        student = StudentFactory.create(user=self.user, section=section)
        response = self.client.get(self.endpoint)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0], {'id': student.pk, 'section_id': section.pk, 'section_spacetime': 'Monday 1:00-2:00 PM',
                                            'course': 'CS61C', 'course_title': 'Machine Structures', 'is_student': True})

    def test_mentor_and_student(self):
        student_section = SectionFactory.create(course=CourseFactory.create(name='CS61C', title='Machine Structures'),
                                                spacetime=SpacetimeFactory.create(start_time=time(hour=13), day_of_week='Mon', duration=timedelta(hours=1)))
        student = StudentFactory.create(user=self.user, section=student_section)
        mentor = MentorFactory.create(user=self.user)
        mentor_section = SectionFactory.create(mentor=mentor, course=CourseFactory.create(name='CS70', title='Discrete Mathematics and Probability Theory'),
                                               spacetime=SpacetimeFactory.create(start_time=time(hour=11), day_of_week='Tue', duration=timedelta(hours=1.5)))
        response = self.client.get(self.endpoint)
        self.assertEqual(len(response.data), 2)
        self.assertTrue({'id': student.pk, 'section_id': student_section.pk, 'section_spacetime': 'Monday 1:00-2:00 PM',
                         'course': 'CS61C', 'course_title': 'Machine Structures', 'is_student': True} in response.data)
        self.assertTrue({'id': mentor.pk, 'section_id': mentor_section.pk, 'section_spacetime': 'Tuesday 11:00-12:30 PM',
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
            "location": new_location
        })
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED, response.data)
        new_spacetime = Spacetime.objects.get(pk=spacetime.pk)
        self.assertEqual(new_spacetime.start_time, new_time)
        self.assertEqual(new_spacetime.location, new_location)
        self.assertEqual(new_spacetime.day_of_week, new_day)
