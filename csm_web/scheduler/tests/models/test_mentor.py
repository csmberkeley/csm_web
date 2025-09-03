import pytest
from scheduler.factories import CourseFactory
from scheduler.models import Mentor, User


@pytest.mark.django_db
def test_create_mentor():
    user = User.objects.create(email="test@berkeley.edu", username="test")
    course = CourseFactory.create(name="course", title="title for course")
    mentor, created = Mentor.objects.get_or_create(course=course, user=user)
    assert created
    assert mentor.course == course
    assert mentor.user == user
    assert Mentor.objects.count() == 1
    assert Mentor.objects.get(course=course).user == user


@pytest.mark.django_db
def test_create_two_mentors_for_one_course():
    user = User.objects.create(email="test@berkeley.edu", username="test")
    course = CourseFactory.create(name="course", title="title for course")
    mentor = Mentor.objects.create(course=course, user=user)
    assert mentor.course == course
    assert mentor.user == user

    mentor = Mentor.objects.create(course=course, user=user)
    assert mentor.course == course
    assert mentor.user == user

    assert Mentor.objects.count() == 2
