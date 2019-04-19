from datetime import timedelta
from random import randrange
from django.test import TestCase
from django.utils import timezone
from os import path
from rest_framework import status
from rest_framework.test import APIClient
import random

from scheduler.models import Profile, User, Attendance
from scheduler.factories import (
    CourseFactory,
    SpacetimeFactory,
    UserFactory,
    ProfileFactory,
    SectionFactory,
    AttendanceFactory,
    OverrideFactory,
    create_attendances_for,
)

random.seed(0)

COURSE_NAMES = ("CS88", "CS61A", "CS61B", "CS70", "CS61C", "EE16A")
ROLE_MAP = Profile.ROLE_MAP

# ----- REQUEST UTILITIES -----
def fail_msg(ep, resp):
    return "Endpoint: {}\nResponse Content: {}".format(ep, resp.content)


class APITestCase(TestCase):
    """
    A test case class that provides utility methods for testing HTTP requests.
    """

    ALL_METHODS = set(["GET", "POST", "PATCH", "PUT", "DELETE"])
    """
    A mapping of endpoint URL to a list of allowed methods.
    """
    ALLOWED_METHODS = {}


    """
    Maps an HTTP method to the appropriate success status code.
    """
    _SUCCESS_CODES = {
        "GET": status.HTTP_200_OK,
        "POST": status.HTTP_201_CREATED,
        "PUT": status.HTTP_200_OK,
        "PATCH": status.HTTP_204_NO_CONTENT,
        "DELETE": status.HTTP_200_OK
    }

    def test_bad_methods(self):
        """
        Tests to make sure that for each endpoint that's a key in the ALLOWED_METHODS dict,
        any method not in the associated list should fail.
        """
        client = self.get_client_for(User.objects.first())
        for endpoint, methods in self.ALLOWED_METHODS.items():
            forbidden = self.ALL_METHODS - set(methods)
            for f in forbidden:
                self.req_fails_method(client, f, endpoint)

    def get_client_for(self, user):
        """Returns an APIClient object that is logged in as the provided user."""
        client = APIClient()
        client.force_authenticate(user)
        return client

    def request(self, client, method, endpoint, exp_code=None, data=None):
        """
        Performs a request to the specified endpoint and returns the response object.
        Also checks if the status code of the response is exp_code, if provided.
        The method parameter should be a get/post/etc from an APIClient object.
        """
        methods = {
            "GET": client.get,
            "POST": client.post,
            "PATCH": client.patch,
            "PUT": client.put,
            "DELETE": client.delete,
        }
        resp = methods[method](endpoint, follow=True, data=data)
        if exp_code is not None:
            self.assertEqual(resp.status_code, exp_code, msg=fail_msg(endpoint, resp))
        return resp

    def req_fails_perms(self, client, method, endpoint, data=None):
        """
        Performs a request to the specified endpoint, and checks that it fails
        due to the user lacking proper permissions.
        The method parameter should be a get/post/etc from an APIClient object.
        Returns the response object afterwards.
        """
        return self.request(
            client, method, endpoint, exp_code=status.HTTP_403_FORBIDDEN, data=data
        )

    def req_fails_method(self, client, method, endpoint, data=None):
        """
        Performs a request to the specified endpoint, and checks that it fails
        due to the endpoint not supporting the provided method.
        Returns the response object.
        """
        return self.request(
            client,
            method,
            endpoint,
            exp_code=status.HTTP_405_METHOD_NOT_ALLOWED,
            data=data,
        )

    def req_succeeds(self, client, method, endpoint, data=None):
        """
        Performs a request to the specified endpoint, and checks that it succeeds.
        The method parameter should be a get/post/etc from an APIClient object.
        Returns the response object.
        """
        return self.request(
            client, method, endpoint, exp_code=APITestCase._SUCCESS_CODES[method], data=data
        )

# ------ MISCELLANEOUS TESTING TOOLS -----
def rand_date(before=1000, after=1000):
    """
    Generates a random date in [today - before, today + after].
    """
    return timezone.now().date() + timedelta(days=randrange(-before, after))


# ----- MODEL GENERATION -----


def random_objs(clazz, n=1):
    """
    Generates N instances of the provided class, retrieved from the database.
    """
    src = clazz.objects.all()
    for _ in range(n):
        yield random.choice(src)


def make_test_courses():
    """Creates course objects and persists them to database."""
    return [CourseFactory.create(name=name) for name in COURSE_NAMES]


def make_test_users(n):
    """Creates N test users and persists them to database."""
    return UserFactory.create_batch(n)


def give_role(user, role, course):
    """
	Creates a profile for USER in a given ROLE for the provided COURSE, and
	saves the profile to database.
	"""
    return ProfileFactory.create(
        user=user, course=course, leader=None, section=None, role=role
    )


def create_empty_section_for(mentor):
    """
	Creates a section for MENTOR without populated students.
	"""
    section = SectionFactory.create(course=mentor.course)
    mentor.section = section
    mentor.save()
    return section


def enroll_user_as_student(user, section):
    """
	Creates a student profile for USER, and assigns them to the given SECTION.
	Also creates blank attendances as necessary.
	Returns the created profile.
	"""
    student = give_role(user, Profile.STUDENT, section.course)
    student.section = section
    student.leader = section.leader
    student.save()
    create_attendances_for(student)
    return student


def gen_test_data(cls, NUM_USERS=300):
    """
	Adds NUM_USERS users to the database and initializes profiles for them as follows:
	- 2 coords per course
	- 4 SMs per coord, each with a section of 3-6 students
	- 3 JMs per SM, each with a section of 3-6 students
	"""
    users = iter(make_test_users(NUM_USERS))
    courses = make_test_courses()
    # for sanity tests, everyone only has one role for now
    num_courses = len(courses)
    COORD_COUNT = 2
    SM_COUNT = 4
    # These are per SM /shrug
    JM_COUNT = 3
    AM_COUNT = 1

    def assign(role, leader, c):
        # returns the profile created
        profile = give_role(next(users), role, c)
        profile.leader = leader
        profile.save()
        return profile

    try:
        for c in courses:
            # coords
            for _ in range(COORD_COUNT):
                coord = assign(Profile.COORDINATOR, None, c)
                # SMs
                for _ in range(SM_COUNT):
                    sm = assign(Profile.SENIOR_MENTOR, None, c)
                    section = create_empty_section_for(sm)
                    for _ in range(random.randint(3, 6)):
                        enroll_user_as_student(next(users), section)
                    # JMs
                    for _ in range(JM_COUNT):
                        jm = assign(Profile.JUNIOR_MENTOR, None, c)
                        section = create_empty_section_for(jm)
                        for _ in range(random.randint(3, 6)):
                            enroll_user_as_student(next(users), section)
                    for _ in range(AM_COUNT):
                        am = assign(Profile.ASSOCIATE_MENTOR, None, c)
                        section = create_empty_section_for(am)
                        for _ in range(random.randint(3, 6)):
                            enroll_user_as_student(next(users), section)
    except StopIteration:
        pass
