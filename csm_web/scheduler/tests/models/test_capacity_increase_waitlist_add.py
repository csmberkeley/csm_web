import pytest

from scheduler.factories import (
    CoordinatorFactory,
    CourseFactory,
    MentorFactory,
    SectionFactory,
    UserFactory,
)
from scheduler.models import Section, Student, WaitlistedStudent


@pytest.fixture(name="setup_waitlist")
def fixture_setup_waitlist(db):  # pylint: disable=unused-argument
    """
    Mentor, waitlisted student, enrolled student, course, and a section
    with capacity 1 / waitlist capacity 3.
    """
    mentor_user, waitlisted_student_user, enrolled_student_user = (
        UserFactory.create_batch(3)
    )
    course = CourseFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=3)
    return mentor_user, waitlisted_student_user, enrolled_student_user, course, section


@pytest.fixture(name="coord_client")
def fixture_coord_client(client, setup_waitlist):
    """Client logged in as a coordinator for the section's course."""
    _, _, _, course, _ = setup_waitlist
    coord_user = UserFactory.create()
    CoordinatorFactory.create(user=coord_user, course=course)
    client.force_login(coord_user)
    return client


def patch_section(client, section, **overrides):
    """PATCH the section with its current values, overridden by kwargs."""
    data = {
        "capacity": section.capacity,
        "description": section.description,
        "waitlist_capacity": section.waitlist_capacity,
        **overrides,
    }
    return client.patch(
        f"/api/sections/{section.pk}/", data, content_type="application/json"
    )


def is_enrolled(user, section):
    return Student.objects.filter(user=user, section=section, active=True).exists()


def is_waitlisted(user, section):
    return WaitlistedStudent.objects.filter(
        user=user, section=section, active=True
    ).exists()


@pytest.mark.django_db
def test_create_waitlisted_student(setup_waitlist):
    """
    Given we create a waitlisted student object,
    When we call create
    It correctly creates a waitlisted student object for the section and user.
    """
    mentor_user, waitlisted_student_user, _, course, section = setup_waitlist

    waitlisted_student = WaitlistedStudent.objects.create(
        user=waitlisted_student_user, course=course, section=section
    )

    assert WaitlistedStudent.objects.count() == 1
    assert waitlisted_student.user == waitlisted_student_user
    assert waitlisted_student.course == course
    assert waitlisted_student.section == section
    assert waitlisted_student.section.mentor.user == mentor_user
    assert waitlisted_student.section.mentor.course == course

    # waitlisting doesn't enroll anyone
    assert section.students.count() == 0
    assert section.waitlist_set.count() == 1


@pytest.mark.django_db
def test_add_on_capacity_increase(setup_waitlist, coord_client):
    """
    Given a full section with one waitlisted student,
    When a coordinator bumps capacity by 1
    The waitlisted student is enrolled and removed from the waitlist.
    """
    _, waitlisted_user, enrolled_user, course, section = setup_waitlist
    WaitlistedStudent.objects.create(user=waitlisted_user, course=course, section=section)
    Student.objects.create(user=enrolled_user, course=course, section=section)

    assert section.current_student_count == 1
    assert WaitlistedStudent.objects.count() == 1

    response = patch_section(coord_client, section, capacity=2, description="awooga")
    assert response.status_code in (200, 202, 204)

    section = Section.objects.get(pk=section.pk)
    assert section.capacity == 2
    assert section.description == "awooga"
    assert section.current_student_count == 2
    assert is_enrolled(waitlisted_user, section)
    assert is_enrolled(enrolled_user, section)
    assert not is_waitlisted(waitlisted_user, section)


@pytest.mark.django_db
def test_capacity_increase_respects_waitlist_order(setup_waitlist, coord_client):
    """
    Given 3 waitlisted students and a +1 capacity bump,
    Only the earliest waitlisted student gets enrolled.
    """
    _, first_user, enrolled_user, course, section = setup_waitlist
    second_user, third_user = UserFactory.create_batch(2)
    Student.objects.create(user=enrolled_user, course=course, section=section)
    for user in (first_user, second_user, third_user):
        WaitlistedStudent.objects.create(user=user, course=course, section=section)

    patch_section(coord_client, section, capacity=2)

    section = Section.objects.get(pk=section.pk)
    assert is_enrolled(first_user, section)
    assert not is_enrolled(second_user, section)
    assert not is_enrolled(third_user, section)
    assert is_waitlisted(second_user, section)
    assert is_waitlisted(third_user, section)
    assert section.current_student_count == 2


@pytest.mark.django_db
def test_capacity_increase_larger_than_waitlist(setup_waitlist, coord_client):
    """
    Given 1 waitlisted student and a +3 capacity bump,
    The waitlist empties and the section is left under capacity (no crash).
    """
    _, waitlisted_user, enrolled_user, course, section = setup_waitlist
    Student.objects.create(user=enrolled_user, course=course, section=section)
    WaitlistedStudent.objects.create(user=waitlisted_user, course=course, section=section)

    response = patch_section(coord_client, section, capacity=4)
    assert response.status_code in (200, 202, 204)

    section = Section.objects.get(pk=section.pk)
    assert section.current_student_count == 2
    assert section.waitlist_set.filter(active=True).count() == 0


@pytest.mark.django_db
def test_capacity_increase_empty_waitlist(setup_waitlist, coord_client):
    """Bumping capacity with nobody waitlisted just updates capacity."""
    _, _, enrolled_user, course, section = setup_waitlist
    Student.objects.create(user=enrolled_user, course=course, section=section)

    patch_section(coord_client, section, capacity=5)

    section = Section.objects.get(pk=section.pk)
    assert section.capacity == 5
    assert section.current_student_count == 1


@pytest.mark.django_db
def test_capacity_decrease_does_not_drop_or_add(setup_waitlist, coord_client):
    """
    Lowering capacity shouldn't kick enrolled students
    or pull anyone off the waitlist.
    """
    _, waitlisted_user, enrolled_user, course, section = setup_waitlist
    section.capacity = 2
    section.save()
    other_user = UserFactory.create()
    Student.objects.create(user=enrolled_user, course=course, section=section)
    Student.objects.create(user=other_user, course=course, section=section)
    WaitlistedStudent.objects.create(user=waitlisted_user, course=course, section=section)

    patch_section(coord_client, section, capacity=1)

    section = Section.objects.get(pk=section.pk)
    assert section.current_student_count == 2
    assert is_waitlisted(waitlisted_user, section)
    assert not is_enrolled(waitlisted_user, section)


@pytest.mark.django_db
def test_non_coordinator_cannot_change_capacity(setup_waitlist, client):
    """A student can't bump capacity to pull people off the waitlist."""
    _, waitlisted_user, enrolled_user, course, section = setup_waitlist
    Student.objects.create(user=enrolled_user, course=course, section=section)
    WaitlistedStudent.objects.create(user=waitlisted_user, course=course, section=section)

    client.force_login(enrolled_user)
    response = patch_section(client, section, capacity=2)

    assert response.status_code in (403, 404)
    section = Section.objects.get(pk=section.pk)
    assert section.capacity == 1
    assert is_waitlisted(waitlisted_user, section)