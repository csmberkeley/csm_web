from django.test import TestCase
from os import path
from rest_framework import status
from rest_framework.test import APIClient
import random

from scheduler.models import Profile, User
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
BASE_PATH = "/api"

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

    def test_bad_methods(self):
        """
        Tests to make sure that for each endpoint that's a key in the ALLOWED_METHODS dict,
        any method not in the associated list should fail.
        """
        client = self.get_client_for(User.objects.first())
        for endpoint, methods in self.ALLOWED_METHODS.items():
            forbidden = self.ALL_METHODS - methods
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
        resp = methods[method](
            path.join(BASE_PATH, endpoint.strip("/")), follow=True, data=data
        )
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
            client, method, endpoint, exp_code=status.HTTP_200_OK, data=data
        )


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
    return SectionFactory.create(course=mentor.course)


def enroll_user_as_student(user, section):
    """
	Creates a student profile for USER, and assigns them to the given SECTION.
	Also creates blank attendances as necessary.
	Returns the created profile.
	"""
    student = give_role(user, Profile.STUDENT, section.course)
    student.section = section
    student.leader = section.leader
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
    coords, seniors, juniors, students = [], [], [], []
    COORD_COUNT = 2
    SM_COUNT = 4
    JM_COUNT = 3

    def assign(role, leader, c, lst):
        # returns the profile created
        profile = give_role(next(users), role, c)
        profile.leader = leader
        lst.append(profile)
        return profile

    try:
        for c in courses:
            # coords
            for i in range(COORD_COUNT):
                coord = assign(Profile.COORDINATOR, None, c, coords)
                # SMs
                for j in range(SM_COUNT):
                    sm = assign(Profile.SENIOR_MENTOR, None, c, seniors)
                    section = create_empty_section_for(sm)
                    for k in range(random.randint(3, 6)):
                        students.append(enroll_user_as_student(next(users), section))
                    # JMs
                    for k in range(JM_COUNT):
                        jm = assign(Profile.JUNIOR_MENTOR, None, c, juniors)
                        for _ in range(random.randint(3, 6)):
                            students.append(
                                enroll_user_as_student(next(users), section)
                            )
    except StopIteration:
        pass
    cls.users = users
    cls.courses = courses
    cls.coords = coords
    cls.seniors = seniors
    cls.juniors = juniors
    cls.students = students
