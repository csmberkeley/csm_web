from django.test import TestCase
from rest_framework.test import APIRequestFactory

from scheduler.factories import (
	CourseFactory,
	SpacetimeFactory,
	UserFactory,
	ProfileFactory,
	SectionFactory,
	AttendanceFactory,
	OverrideFactory,
	create_attendances_for
)
from scheduler.models import Profile

COURSE_NAMES = ("CS88", "CS61A", "CS61B", "CS70", "CS61C", "EE16A")
ROLE_MAP = Profile.ROLE_MAP

def make_test_courses():
	"""Creates course objects and persists them to database."""
	return (CourseFactory.create(name=name) for name in COURSE_NAMES)

def make_test_users(n):
	"""Creates N test users and persists them to database."""
	return UserFactory.create_batch(n)

def give_role(user, role, course):
	"""
	Creates a profile for USER in a given ROLE for the provided COURSE, and
	saves the profile to database.
	"""
	return ProfileFactory.create(
		user=user,
		course=course,
		leader=None,
		section=None,
		role=role
	)

def create_empty_section_for(mentor):
	"""
	Creates a section for MENTOR without populated students, and saves
	it to database.
	"""
	assert mentor.role in (ROLE_MAP["SM"], ROLE_MAP["JM"])
	return SectionFactory.create(course=mentor.course, mentor=mentor)

def enroll_student(student, section):
	"""
	Enrolls a student in the given section, and creates attendances as needed.
	"""
	assert student.role == ROLE_MAP["ST"]
	student.section = section
	create_attendances_for(student)

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