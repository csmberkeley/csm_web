import pytest
from scheduler.factories import (
    CourseFactory,
    MentorFactory,
    SectionFactory,
    UserFactory,
)
from scheduler.models import Student, WaitlistedStudent


@pytest.fixture(name="setup_waitlist")
def fixture_setup_waitlist(db):  # pylint: disable=unused-argument
    """
    Set up a mentor user, student user, course, and section for waitlist testing
    """
    mentor_user, student_user = UserFactory.create_batch(2)
    course = CourseFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor)
    return mentor_user, student_user, course, section


@pytest.mark.django_db
def test_create_waitlisted_student(setup_waitlist):
    """
    Given we create a waitlisted student object,
    When we call create
    It correctly creates a waitlisted student object for the section and user.
    """
    mentor_user, waitlisted_student_user, course, section = setup_waitlist

    waitlisted_student = WaitlistedStudent.objects.create(
        user=waitlisted_student_user, course=course, section=section
    )

    assert waitlisted_student.user == waitlisted_student_user
    assert WaitlistedStudent.objects.count() == 1
    assert (
        WaitlistedStudent.objects.get(user=waitlisted_student_user).user
        == waitlisted_student_user
    )

    assert waitlisted_student.course == course
    assert waitlisted_student.section == section
    assert waitlisted_student.section.mentor.user == mentor_user
    assert waitlisted_student.section.mentor.course == course
    assert waitlisted_student.section.mentor.section == section

    assert (
        waitlisted_student.section.students.count() == 0
    )  # no students were added to the section
    assert waitlisted_student.section.waitlist_set.count() == 1


@pytest.mark.django_db
def test_user_cannot_enroll_in_course(setup_waitlist, client):
    """
    Given a student or mentor in the course,
    When they attempt to enroll or waitlist for a section,
    Then they are denied with an appropriate error.
    """
    mentor_user, user, _, section = setup_waitlist

    client.force_login(mentor_user)
    response = client.post(f"/api/waitlist/{section.pk}/add/")

    assert response.status_code == 403
    assert (
        response.data["detail"]
        == "You are either mentoring for this course, already enrolled in a section, "
        "or the course is closed for enrollment."
    )
    assert WaitlistedStudent.objects.count() == 0

    client.force_login(user)
    response = client.post(
        f"/api/waitlist/{section.pk}/add/"
    )  # should auto enroll user
    assert WaitlistedStudent.objects.count() == 0
    assert Student.objects.count() == 1

    client.force_login(user)
    response = client.post(
        f"/api/waitlist/{section.pk}/add/"
    )  # fails because user is in section
    assert response.status_code == 403
    assert (
        response.data["detail"]
        == "You are either mentoring for this course, already enrolled in a section, "
        "or the course is closed for enrollment."
    )
    assert WaitlistedStudent.objects.count() == 0


@pytest.mark.django_db
def test_user_can_waitlist_only_once(setup_waitlist, client):
    """
    Given a section that is full,
    When a user attempts to enroll directly,
    Then they are denied with an appropriate error.
    """
    _, waitlisted_student_user, _, section = setup_waitlist

    while not section.is_section_full:
        new_student = UserFactory.create_batch(1)[0]
        client.force_login(new_student)
        response = client.post(f"/api/waitlist/{section.pk}/add/")

    client.force_login(waitlisted_student_user)
    response = client.post(f"/api/waitlist/{section.pk}/add/")

    assert response.status_code == 201
    assert WaitlistedStudent.objects.count() == 1

    client.force_login(waitlisted_student_user)
    response = client.post(f"/api/waitlist/{section.pk}/add/")

    assert response.status_code == 403
    assert response.data["detail"] == "You are already waitlisted in this section."
    assert WaitlistedStudent.objects.count() == 1


@pytest.mark.django_db
def test_waitlist_is_full(setup_waitlist, client):
    """
    Given a section where the waitlist is full,
    When a user attempts to join the waitlist,
    Then they are denied with an appropriate error.
    """
    _, waitlisted_student_user, _, section = setup_waitlist

    while not section.is_waitlist_full:
        new_student = UserFactory.create_batch(1)[0]
        client.force_login(new_student)
        response = client.post(f"/api/waitlist/{section.pk}/add/")

    client.force_login(waitlisted_student_user)
    response = client.post(f"/api/waitlist/{section.pk}/add/")

    assert response.status_code == 403
    assert response.data["detail"] == "There is no space available in this section."
    assert WaitlistedStudent.objects.count() == 3


@pytest.mark.django_db
def test_user_exceeds_max_waitlists_for_course(setup_waitlist, client):
    """
    Given a user who has waitlisted in the maximum number of waitlists allowed for the course,
    When they attempt to join another waitlist for the course,
    Then they are denied with an appropriate error.
    """
    _, waitlisted_student_user, course, section = setup_waitlist

    # Create and fill sections, waitlist until max waitlists achieved
    for _ in range(course.waitlist_capacity):
        mentor_user = UserFactory.create_batch(1)[0]
        mentor = MentorFactory.create(course=course, user=mentor_user)
        section_test = SectionFactory.create(mentor=mentor)

        while not section_test.is_section_full:
            new_student = UserFactory.create_batch(1)[0]
            client.force_login(new_student)
            response = client.post(f"/api/waitlist/{section_test.pk}/add/")

        client.force_login(waitlisted_student_user)
        response = client.post(f"/api/waitlist/{section_test.pk}/add/")
    # Verify max waitlists achieved
    assert WaitlistedStudent.objects.count() == course.waitlist_capacity

    while not section.is_section_full:
        new_student = UserFactory.create_batch(1)[0]
        client.force_login(new_student)
        response = client.post(f"/api/waitlist/{section.pk}/add/")

    # Verify errors when attempting to add another waitlist
    client.force_login(waitlisted_student_user)
    response = client.post(f"/api/waitlist/{section.pk}/add/")
    assert response.status_code == 403
    assert WaitlistedStudent.objects.count() == course.waitlist_capacity

    # Check if user is dropped when adding to a section
    mentor_user = UserFactory.create_batch(1)[0]
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section_test = SectionFactory.create(mentor=mentor)

    client.force_login(waitlisted_student_user)
    response = client.post(f"/api/waitlist/{section_test.pk}/add/")
    assert WaitlistedStudent.objects.filter(active=True).count() == 0
    # Verify student is inactive on waitlists after adding to a section.
