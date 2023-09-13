import pytest
from django.urls import reverse
from scheduler.factories import (
    CourseFactory,
    MentorFactory,
    SectionFactory,
    StudentFactory,
    UserFactory,
)
from scheduler.models import Section


@pytest.fixture
def setup_test_scheduler():
    """
    Create a course, coordinator, mentor, and a student for testing.
    """
    # Setup course
    course = CourseFactory.create()
    # Setup coordinator for course
    coordinator_user = UserFactory.create()

    return (
        course,
        coordinator_user,
    )


@pytest.mark.django_db
def test_section_delete(client, setup_scheduler):
    """
    Test that a section can be deleted.
    """
    (
        section_one,
        coordinator_user,
    ) = setup_scheduler
    # Login as coordinator
    client.force_login(coordinator_user)
    # Delete section
    response = client.delete(reverse("section-detail", kwargs={"pk": section_one.id}))
    # Check that section was deleted
    assert response.status_code == 204
    assert Section.objects.count() == 1


def create_students(course, section, quantity):
    """
    Creates a given number of students for a given section.
    """
    student_users = UserFactory.create_batch(quantity)
    students = []
    for student_user in student_users:
        student = StudentFactory.create(
            user=student_user, course=course, section=section
        )
        students.append(student)
    return students


def create_section(course):
    """
    Creates a section for a given course.
    """
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(user=mentor_user, course=course)
    section = SectionFactory.create(mentor=mentor)
    return section
