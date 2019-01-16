from django.test import TestCase
import random

from scheduler.models import Profile
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

COURSE_NAMES = ("CS88", "CS61A", "CS61B", "CS70", "CS61C", "EE16A")
ROLE_MAP = Profile.ROLE_MAP


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
    return SectionFactory.create(course=mentor.course, mentor=mentor)


def enroll_user_as_student(user, section):
    """
	Creates a student profile for USER, and assigns them to the given SECTION.
	Also creates blank attendances as necessary.
	Returns the created profile.
	"""
    student = give_role(user, Profile.STUDENT, section.course)
    student.section = section
    student.mentor = section.leader
    create_attendances_for(student)
    return student


def gen_test_data(cls, NUM_USERS=300):
    """
	Adds NUM_USERS users to the database and initializes profiles for them as follows:
	- 2 coords per course
	- 4 SMs per coord, each with a section of 3-6 students
	- 3 JMs per SM, each with a section of 3-6 students
	"""
    random.seed(0)
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
        lst.append(profile)
        return profile

    try:
        for c in courses:
            # coords
            for i in range(COORD_COUNT):
                coord = assign(Profile.COORDINATOR, None, c, coords)
                # SMs
                for j in range(SM_COUNT):
                    sm = assign(Profile.SENIOR_MENTOR, coord, c, seniors)
                    section = create_empty_section_for(sm)
                    for k in range(random.randint(3, 6)):
                        enroll_user_as_student(next(users), section)
                        # JMs
                    for k in range(JM_COUNT):
                        jm = assign(Profile.JUNIOR_MENTOR, sm, c, juniors)
                        for _ in range(random.randint(3, 6)):
                            enroll_user_as_student(next(users), section)
    except StopIteration:
        pass
    cls.users = users
    cls.courses = courses
    cls.coords = coords
    cls.seniors = seniors
    cls.juniors = juniors
    cls.students = students


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
