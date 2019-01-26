from django.test import TestCase
from rest_framework.test import APIClient
import random

import scheduler.models as models
import scheduler.serializers as serial
from .utils import gen_test_data, APITestCase, random_objs


class TestAPI(APITestCase):
    """
    Tests correctness of responses from API endpoints, as well as whether the API endpoints
    are enforcing the correct permissions.

    The following endpoints can be queried by all users WITHOUT LOGIN:
    - /courses (GET): lists all courses that are active
    - /courses/$ID (GET): lists sections for the course with the specified ID or slug
    - /sections/$ID (GET): provides information about a section;
        properties vary depending on the profile of the requester

    The following endpoints can be queried by all users WITH LOGIN:
    - /profiles (GET): lists profiles for the current user
    - /profiles/$ID (GET): returns details for the profile with $ID;
        requester must be owner or leader
    - /profiles/$ID/unenroll (DELETE): drops a student from a section by deactivating the profile;
        requester must be owner or leader
    - /profiles/$ID/attendance (GET): returns the attendances for the student profile;
        requester must be owner or leader
    - /attendances/$ID (GET): returns the specified attendance object;
        requester must be owner or leader
    - /attendances/$ID (POST): updates the specified attendance object;
        must be leader (since students presumably can't update their own attendances)
    - /sections/$ID/enroll (POST): enrolls a student in a section, if possible
    - /overrides/$ID (GET): returns the override with the given ID;
        allows POST by a leader
    - /overrides (POST): creates an override for a section;
        must be leader
    """

    @classmethod
    def setUpTestData(cls):
        gen_test_data(cls, 300)

    # TODO make sure we can't POST to GET-only endpoints and vice versa

    def test_all(self, client=None):
        """
        Tests requests that can be made by any user.
        """
        if client is None:
            client = APIClient()
        course_req = self.req_succeeds(client.get, "/courses")
        # attempt to query every course in the list of courses
        COURSE_FIELDS = (
            "id",
            "name",
            "valid_until",
            "enrollment_start",
            "enrollment_end",
        )
        for course in course_req.data:
            for field in COURSE_FIELDS:
                self.assertIn(field, course)
            slug = course["name"]
            # TODO: since we provide details in /course anyway, why do we still have this endpoint?
            detail_req = self.req_succeeds(client.get, "/courses/{}".format(slug))
            for field in COURSE_FIELDS:
                self.assertIn(field, detail_req.data)
        # query a few random sections
        SECTION_FIELDS = ("course", "mentor", "default_spacetime", "capacity")
        for s in random_objs(models.Section, n=10):
            section_req = self.req_succeeds(client.get, "/sections/{}".format(s.id))
            # unauthenticated user should see course, mentor, default_spacetime, and capacity
            # need to check presence of fields as well as obj equality to ensure
            # we didn't put anything extra/leave anything out
            for field in SECTION_FIELDS:
                self.assertIn(field, section_req.data)
            exp = serial.SectionSerializer(s).data
            self.assertEquals(exp, section_req.data)
        # TODO view overrides

    def test_fail_no_login(self, client=None):
        """
        Tests requests that should fail when not logged in.
        """
        if client is None:
            client = APIClient()
        failed_gets = (
            "/profiles",
            (models.Profile, "/profiles/{}"),
            (models.Attendance, "/profiles/{}/attendance"),
            (models.Attendance, "/attendances/{}"),
        )
        for ep in failed_gets:
            if isinstance(ep, str):
                self.req_fails_perms(client.get, ep)
            else:
                clazz, s = ep
                for obj in random_objs(clazz, 10):
                    self.req_fails_perms(client.get, s.format(obj.id))

    def test_as_no_profile(self):
        """
        Tests requests made by a logged in user with no profile.
        """
        self.test_all()

        # /profiles/$ID/unenroll (DELETE): drops a student from a section by deactivating the profile;
        #         requester must be owner or leader
        # /attendances/$ID (GET): returns the specified attendance object;
        #         requester must be owner or leader
        # /attendances/$ID (POST): updates the specified attendance object;
        #         must be leader (since students presumably can't update their own attendances)
        # /sections/$ID/enroll (POST): enrolls a student in a section, if possible
        # /overrides (POST): returns a list of overrides for a given section
        # /overrides/$ID (PUT): creates an override for section with ID;
        #         must be the mentor of the section

    def test_as_student(self):
        """
        Tests requests that can or cannot be made if the logged in user
        has only student profiles.
        """
        client = self.get_client_for(random.choice(self.students))
        self.test_all()
        client.logout()

    def test_as_jm(self):
        """
        Tests requests that can or cannot be made if the logged in user
        has only junior mentor profiles.
        """
        client = self.get_client_for(random.choice(self.juniors))
        self.test_all()
        client.logout()

    def test_as_sm(self):
        """
        Tests requests that can or cannot be made if the logged in user
        has only senior mentor profiles.
        """
        client = self.get_client_for(random.choice(self.seniors))
        self.test_all()
        client.logout()

    def test_as_coord(self):
        """
        Tests requests that can or cannot be made if the logged in user
        has only coordinator profiles.
        """
        client = self.get_client_for(random.choice(self.coords))
        self.test_all()
        client.logout()

    # TODO tests for users that have a mix profiles


"""
path("", views.index, name="index"),
path("login", views.login, name="login"),
path("logout", views.logout, name="logout"),

path("courses/", views.CourseList.as_view()),
path("courses/<slug:name>/", views.CourseDetail.as_view()),
path("courses/<slug:name>/sections/", views.CourseSectionList.as_view()),
path("profiles/", views.UserProfileList.as_view()),
path("profiles/<int:pk>/", views.UserProfileDetail.as_view()),
path("profiles/<int:pk>/attendance", views.UserProfileAttendance.as_view()),
path("profiles/<int:pk>/unenroll", views.DeleteProfile.as_view()),
path("sections/<int:pk>/enroll", views.enroll, name="enroll"),
path("sections/<int:pk>/", views.SectionDetail.as_view()),
path("overrides/", views.CreateOverrideDetail.as_view()),
path("overrides/<int:pk>/", views.OverrideDetail.as_view()),
path("attendances/", views.CreateAttendanceDetail.as_view()),
path("attendances/<int:pk>/", views.AttendanceDetail.as_view()),

router.register(r"users", views.UserViewSet)
router.register(r"allprofiles", views.ProfileViewSet)
router.register(r"spacetimes", views.SpacetimeViewSet)
"""
