from os import path
from django.test import TestCase
from rest_framework.test import APIClient

from scheduler.factories import (
    CourseFactory,
    UserFactory,
    StudentFactory,
    SectionFactory,
    create_attendances_for,
)

COURSE_NAMES = ("CS88", "CS61A", "CS61B", "CS70", "CS61C", "EE16A", "EE16B")
BASE_PATH = "/api/"

# ----- REQUEST UTILITIES -----


def fail_msg(ep, resp):
    return "Endpoint: {}\nResponse Content: {}".format(ep, resp.content)


class APITestCase(TestCase):
    def get_client_for(self, user):
        """Returns an APIClient object that is logged in as the provided user."""
        client = APIClient()
        client.force_authenticate(user)
        return client

    def request(self, method, endpoint, exp_code=None, data=None):
        """
        Performs a request to the specified endpoint and returns the response object.
        Also checks if the status code of the response is exp_code, if provided.
        The method parameter should be a get/post/etc from an APIClient object.
        """
        full_path = path.join(BASE_PATH, endpoint.strip("/"))
        if full_path[-1] != "/":
            full_path += "/"
        resp = method(full_path, follow=True, data=data)
        if exp_code is not None:
            self.assertEqual(resp.status_code, exp_code, msg=fail_msg(full_path, resp))
        return resp


# ----- MODEL GENERATION -----


def make_test_courses():
    """Creates course objects and persists them to database."""
    return [CourseFactory.create(name=name) for name in COURSE_NAMES]


def make_test_users(n):
    """Creates N test users and persists them to database."""
    return UserFactory.create_batch(n)


def create_empty_section_for(mentor):
    """
    Creates a section for MENTOR without populated students.
    """
    return SectionFactory.create(course=mentor.course, mentor=mentor)


def enroll_user_as_student(user, section, save=True):
    """
    Creates a student profile for USER, and assigns them to the given SECTION.
    The student is saved to database.
    Returns the created profile.
    """
    student = StudentFactory.create(user=user)
    student.section = section
    if save:
        student.save()
    return student
