"""
Test cases to simulate simple enrollment and drop scenarios.
"""
import logging
from rest_framework import status
from scheduler.models import Student
from scheduler.tests import utils
from scheduler.factories import (
    UserFactory,
    CourseFactory,
    MentorFactory,
    SectionFactory
)


def get_enroll_url_for(section):
    return f"/sections/{section.id}/students"


def get_drop_url_for(student):
    return f"/students/{student.id}/drop"


class DropTest(utils.APITestCase):
    """
    Tests that a student is able to drop a section.
    """

    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.my_course = CourseFactory.create()
        self.other_course = CourseFactory.create()
        self.user = UserFactory.create()
        self.client = self.get_client_for(self.user)

    def count_student_profiles_in(self, course):
        return Student.objects.filter(
            user=self.user,
            section__course=course,
            active=True
        ).count()

    def drop_and_should_succeed(self, student):
        url = get_drop_url_for(student)
        self.request(self.client.patch, url)

    def test_simple(self):
        """
        Tests that the student should be able to drop a section they just enrolled in.
        """
        ...

    def test_without_enroll(self):
        """
        Tests that a student should be unable to drop a section they're not enrolled in.
        """
        ...

    def test_double_drop(self):
        """
        Tests that dropping is idempotent.
        """
        ...

    def test_with_other_sections(self):
        """
        Tests that a student enrolled in multiple sections only drops the desired one.
        """
        ...


class EnrollmentTest(utils.APITestCase):
    """
    Tests that a student can enroll in a section in these scenarios:
    - The student is enrolled in/is a mentor for no other sections
    - The student is already enrolled in a section in another course
    - The student is a mentor for another course
    - The section is one away from reaching capacity
    - The student was previously enrolled in, but dropped a section in this course
    Also tests that a student cannot enroll in these scenarios:
    - The section is full
    - The section is over capacity
    - The student is already enrolled in a section in this course
    - The student is a mentor in this course
    """

    def setUp(self):
        logging.disable(logging.CRITICAL)
        self.my_course = CourseFactory.create()
        self.other_course = CourseFactory.create()
        self.assertNotEqual(self.my_course, self.other_course)
        self.user = UserFactory.create()
        self.client = self.get_client_for(self.user)

    def count_student_profiles_in(self, course):
        return Student.objects.filter(
            user=self.user,
            section__course=course,
            active=True
        ).count()

    def drop(self, student):
        url = get_drop_url_for(student)
        self.request(self.client.patch, url)

    def enroll_and_should_succeed(self, section):
        url = get_enroll_url_for(section)
        self.request(self.client.put, url, exp_code=status.HTTP_201_CREATED)
        self.assertNotEqual(self.count_student_profiles_in(section.course), 0)

    def enroll_and_should_fail(self, section):
        old_profile_count = self.count_student_profiles_in(section.course)
        url = get_enroll_url_for(section)
        request = self.request(self.client.put, url)
        self.assertNotEqual(request.status_code, status.HTTP_201_CREATED)
        new_profile_count = self.count_student_profiles_in(section.course)
        self.assertEqual(new_profile_count, old_profile_count)

    def test_simple(self):
        """
        Tests that enrollment succeeds when the student is enrolled in/is a mentor for no other
        sections.
        """
        section = SectionFactory.create(course=self.my_course)
        self.enroll_and_should_succeed(section)

    def test_student_in_other_course(self):
        """
        Tests that enrollment should succeed when the student is already enrolled in a section in
        another course, but not this one.
        """
        other_section = SectionFactory.create(course=self.other_course)
        my_section = SectionFactory.create(course=self.my_course)
        utils.enroll_user_as_student(self.user, other_section)
        self.enroll_and_should_succeed(my_section)

    def test_mentor_in_other_course(self):
        """
        Tests that enrollment should succeed when the student is a mentor for another course, but
        not a student in this one.
        """
        mentor = MentorFactory.create(user=self.user)
        SectionFactory.create(course=self.other_course, mentor=mentor)
        my_section = SectionFactory.create(course=self.my_course)
        self.enroll_and_should_succeed(my_section)

    def test_last_spot(self):
        """
        Tests that enrollment should succeed if the section is one away from capacity.
        """
        section = SectionFactory.create(course=self.my_course, capacity=1)
        self.enroll_and_should_succeed(section)

    def test_did_drop(self):
        """
        Tests that a student that previously dropped a section is able to reenroll in this course.
        """
        section = SectionFactory.create(course=self.my_course)
        student = utils.enroll_user_as_student(self.user, section)
        self.drop(student)

    def test_full_section(self):
        """
        Tests that enrollment should not fail when the student attempts to enroll in a full section.
        """
        section = SectionFactory.create(course=self.my_course, capacity=0)
        self.enroll_and_should_fail(section)

    def test_over_capacity(self):
        """
        Tests that enrollment should fail when the section is already over capacity (e.g. 6/5).
        """
        ...

    def test_already_enrolled(self):
        """
        Tests that enrollment should fail if the user is already enrolled in a section in this course.
        """
        ...

    def test_is_mentor(self):
        """
        Tests that a mentor should be unable to enroll in a section in their course.
        """
        ...
