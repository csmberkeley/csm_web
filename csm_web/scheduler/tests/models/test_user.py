import json

import pytest
from django.urls import reverse
from scheduler.factories import (
    CoordinatorFactory,
    CourseFactory,
    MentorFactory,
    SectionFactory,
    StudentFactory,
    UserFactory,
)
from scheduler.models import User


@pytest.mark.django_db
def test_create_user():
    """
    Test that a user can be created.
    """
    email = "test@berkeley.edu"
    username = "test"
    user, created = User.objects.get_or_create(email=email, username=username)
    assert created
    assert user.email == email
    assert user.username == username
    assert User.objects.count() == 1
    assert User.objects.get(email=email).username == username


# avoid pylint warning redefining name in outer scope
@pytest.fixture(name="setup_permissions")
def fixture_setup_permissions():
    """
    Setup users, courses, and sections for testing permissions
    """
    student_user = UserFactory(username="student_user")
    other_student_user = UserFactory(username="other_student_user")
    mentor_user = UserFactory(username="mentor_user")
    other_mentor_user = UserFactory(username="other_mentor_user")
    coordinator_user = UserFactory(username="coordinator_user")

    # Create courses
    course_a = CourseFactory(name="course_a")
    course_b = CourseFactory(name="course_b")

    # Assign mentors to courses
    mentor_a = MentorFactory(user=mentor_user, course=course_a)
    mentor_b = MentorFactory(user=other_mentor_user, course=course_b)
    coordinator = CoordinatorFactory(user=coordinator_user, course=course_a)

    # Create sections associated with the correct course via the mentor
    section_a1 = SectionFactory(mentor=mentor_a)
    section_b1 = SectionFactory(mentor=mentor_b)

    # Ensure students are enrolled in sections that match their course
    student_a1 = StudentFactory(user=student_user, section=section_a1, course=course_a)
    other_student_a1 = StudentFactory(
        user=other_student_user, section=section_a1, course=course_a
    )

    return {
        "student_user": student_user,
        "other_student_user": other_student_user,
        "mentor_user": mentor_user,
        "other_mentor_user": other_mentor_user,
        "coordinator_user": coordinator,
        "course_a": course_a,
        "course_b": course_b,
        "section_a1": section_a1,
        "section_b1": section_b1,
        "student_a1": student_a1,
        "other_student_a1": other_student_a1,
    }


###############
# Student tests
###############


@pytest.mark.django_db
def test_student_view_own_profile(client, setup_permissions):
    """
    Test that a student can view their own profile.
    """
    student_user = setup_permissions["student_user"]
    client.force_login(student_user)

    response = client.get(reverse("user_retrieve", kwargs={"pk": student_user.pk}))
    assert response.status_code == 200
    assert response.data["email"] == student_user.email


@pytest.mark.django_db
def test_student_view_other_student_in_same_section(client, setup_permissions):
    """
    Test that a student can view another student in the same section.
    """
    student = setup_permissions["student_user"]
    other_student = setup_permissions["other_student_user"]
    client.force_login(student)
    response = client.get(reverse("user_retrieve", kwargs={"pk": other_student.pk}))
    assert response.status_code == 200
    assert response.data["email"] == other_student.email


@pytest.mark.django_db
def test_student_view_mentors(client, setup_permissions):
    """
    Test that a student can view a mentor's profile.
    """
    student = setup_permissions["student_user"]
    mentor = setup_permissions["mentor_user"]
    client.force_login(student)
    response = client.get(reverse("user_retrieve", kwargs={"pk": mentor.pk}))
    assert response.status_code == 200
    assert response.data["email"] == mentor.email


@pytest.mark.django_db
def test_student_edit_own_profile(client, setup_permissions):
    """
    Test that a student can edit their own profile.
    """
    student = setup_permissions["student_user"]
    client.force_login(student)
    edit_url = reverse("user_update", kwargs={"pk": student.pk})
    response = client.put(
        edit_url,
        data=json.dumps({"first_name": "NewName"}),
        content_type="application/json",
    )
    assert response.status_code == 200
    student.refresh_from_db()
    assert student.first_name == "NewName"


##############
# Mentor tests
##############
@pytest.mark.django_db
def test_mentor_view_own_profile(client, setup_permissions):
    """
    Test that a mentor can view their own profile.
    """
    mentor_user = setup_permissions["mentor_user"]
    client.force_login(mentor_user)

    response = client.get(reverse("user_retrieve", kwargs={"pk": mentor_user.pk}))
    assert response.status_code == 200
    assert response.data["email"] == mentor_user.email


@pytest.mark.django_db
def test_mentor_view_students_in_course(client, setup_permissions):
    """
    Test that a mentor can view student profiles in the course they teach.
    """
    mentor_user = setup_permissions["mentor_user"]
    student_user = setup_permissions["student_user"]
    client.force_login(mentor_user)

    response = client.get(reverse("user_retrieve", kwargs={"pk": student_user.pk}))
    assert response.status_code == 200
    assert response.data["email"] == student_user.email


@pytest.mark.django_db
def test_mentor_cannot_edit_other_profiles(client, setup_permissions):
    """
    Test that a mentor cannot edit another student's or mentor's profile.
    """
    mentor_user = setup_permissions["mentor_user"]
    other_student_user = setup_permissions["other_student_user"]
    client.force_login(mentor_user)
    response = client.put(
        reverse("user_update", kwargs={"pk": other_student_user.pk}),
        data=json.dumps({"first_name": "new_username"}),
        content_type="application/json",
    )
    assert response.status_code == 403


###################
# Coordinator tests
###################


@pytest.mark.django_db
def test_coordinator_view_all_profiles_in_course(client, setup_permissions):
    """
    Test that a coordinator can view all profiles in the course they coordinate.
    """
    coordinator_user = setup_permissions["coordinator_user"]
    student_user = setup_permissions["student_user"]
    client.force_login(coordinator_user)

    response = client.get(reverse("user_retrieve", kwargs={"pk": student_user.pk}))
    assert response.status_code == 200


@pytest.mark.django_db
def test_coordinator_edit_all_profiles_in_course(client, setup_permissions):
    """
    Test that a coordinator can edit all profiles in the course they coordinate.
    """
    coordinator_user = setup_permissions["coordinator_user"]
    student_user = setup_permissions["student_user"]
    client.force_login(coordinator_user)

    response = client.put(
        reverse("user_update", kwargs={"pk": student_user.pk}),
        data=json.dumps({"first_name": "new_student_name"}),
        content_type="application/json",
    )
    assert response.status_code == 200
    student_user.refresh_from_db()
    assert student_user.first_name == "new_student_name"
