import pytest
from scheduler.factories import (
    CoordinatorFactory,
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
    response = client.post(
        f"/api/waitlist/{section.pk}/add/", content_type="application/json"
    )

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
        response = client.post(
            f"/api/waitlist/{section.pk}/add/", content_type="application/json"
        )

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
    for _ in range(course.max_waitlist_enroll):
        mentor_user = UserFactory.create_batch(1)[0]
        mentor = MentorFactory.create(course=course, user=mentor_user)
        section_test = SectionFactory.create(mentor=mentor)

        while not section_test.is_section_full:
            new_student = UserFactory.create_batch(1)[0]
            client.force_login(new_student)
            response = client.post(f"/api/waitlist/{section_test.pk}/add/")

        client.force_login(waitlisted_student_user)
        response = client.post(
            f"/api/waitlist/{section_test.pk}/add/", content_type="application/json"
        )
    # Verify max waitlists achieved
    assert WaitlistedStudent.objects.count() == course.max_waitlist_enroll

    while not section.is_section_full:
        new_student = UserFactory.create_batch(1)[0]
        client.force_login(new_student)
        response = client.post(
            f"/api/waitlist/{section.pk}/add/", content_type="application/json"
        )

    # Verify errors when attempting to add another waitlist
    client.force_login(waitlisted_student_user)
    response = client.post(
        f"/api/waitlist/{section.pk}/add/", content_type="application/json"
    )
    assert response.status_code == 403
    assert WaitlistedStudent.objects.count() == course.max_waitlist_enroll

    # Check if user is dropped from all waitlists for a course when adding to a course section
    mentor_user = UserFactory.create_batch(1)[0]
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section_test = SectionFactory.create(mentor=mentor)

    client.force_login(waitlisted_student_user)
    response = client.post(
        f"/api/waitlist/{section_test.pk}/add/", content_type="application/json"
    )
    assert (
        WaitlistedStudent.objects.filter(
            user=waitlisted_student_user, active=True
        ).count()
        == 0
    )


@pytest.mark.django_db
def test_user_enrolled_from_waitlist_and_dropped_from_others(setup_waitlist, client):
    """
    Given a user waitlisted in two sections for a course,
    When a student in one of the sections drops,
    Then the user is enrolled into that section
    and dropped from their other waitlists for the course.
    """
    _, waitlisted_student_user, course, section1 = setup_waitlist

    # Set up a second section in the same course
    mentor_user = UserFactory.create_batch(1)[0]
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section2 = SectionFactory.create(mentor=mentor)

    # Add user to both waitlists
    for _ in range(section1.capacity):
        test_user = UserFactory.create_batch(1)[0]
        client.force_login(test_user)
        _ = client.post(f"/api/waitlist/{section1.pk}/add/")

    for _ in range(section2.capacity):
        test_user = UserFactory.create_batch(1)[0]
        client.force_login(test_user)
        _ = client.post(f"/api/waitlist/{section2.pk}/add/")

    client.force_login(waitlisted_student_user)
    _ = client.post(
        f"/api/waitlist/{section1.pk}/add/", content_type="application/json"
    )
    _ = client.post(
        f"/api/waitlist/{section2.pk}/add/", content_type="application/json"
    )
    assert (
        WaitlistedStudent.objects.filter(
            user=waitlisted_student_user, active=True
        ).count()
        == 2
    )

    # Enroll from waitlist
    test_student = Student.objects.filter(user=test_user, active=True).first()
    client.force_login(test_user)
    _ = client.patch(f"/api/students/{test_student.pk}/drop/")
    assert (
        WaitlistedStudent.objects.filter(
            user=waitlisted_student_user, active=True
        ).count()
        == 0
    )


@pytest.mark.django_db
def test_user_drops_themselves_successfully(setup_waitlist, client):
    """
    Given a user on the waitlist for a section,
    When they attempt to drop themselves,
    Then the waitlisted_student's active field is set to False,
    And the endpoint returns a 204 status code.
    """
    _, waitlisted_student_user, course, section = setup_waitlist

    waitlisted_student = WaitlistedStudent.objects.create(
        user=waitlisted_student_user, course=course, section=section
    )

    client.force_login(waitlisted_student_user)
    response = client.patch(f"/api/waitlist/{waitlisted_student.pk}/drop/")

    assert response.status_code == 204  # Unsure why 200 is returned
    waitlisted_student.refresh_from_db()
    assert waitlisted_student.active is False


@pytest.mark.django_db
def test_coordinator_drops_student_successfully(setup_waitlist, client):
    """
    Given a coordinator for the course associated with a section,
    When they attempt to drop another user from the waitlist,
    Then the waitlisted_student's active field is set to False,
    And the endpoint returns a 204 status code.
    """
    _, waitlisted_student_user, course, section = setup_waitlist

    waitlisted_student = WaitlistedStudent.objects.create(
        user=waitlisted_student_user, course=course, section=section
    )

    coordinator_user = UserFactory.create_batch(1)[0]
    _ = CoordinatorFactory.create(user=coordinator_user, course=course)

    client.force_login(coordinator_user)
    response = client.patch(f"/api/waitlist/{waitlisted_student.pk}/drop/")

    assert response.status_code == 204
    waitlisted_student.refresh_from_db()
    assert waitlisted_student.active is False


@pytest.mark.django_db
def test_user_drops_without_permission(setup_waitlist, client):
    """
    Given a user who is not a coordinator,
    When they attempt to drop themselves from another section waitlist,
    Then a PermissionDenied exception is raised,
    And the endpoint returns a 403 status code.
    """
    _, waitlisted_student_user, course, section = setup_waitlist

    waitlisted_student = WaitlistedStudent.objects.create(
        user=waitlisted_student_user, course=course, section=section
    )

    unauthorized_user = UserFactory.create_batch(1)[0]
    client.force_login(unauthorized_user)
    response = client.patch(f"/api/waitlist/{waitlisted_student.pk}/drop/")

    assert response.status_code == 403
    assert (
        response.data["detail"]
        == "You do not have permission to drop this student from the waitlist"
    )
    waitlisted_student.refresh_from_db()
    assert waitlisted_student.active is True


@pytest.mark.django_db
def test_user_drops_from_nonexistent_waitlisted_student(setup_waitlist, client):
    """
    Given a user on the waitlist for a non-existent section,
    When they attempt to drop themselves,
    Then the endpoint returns a 404 status code.
    """
    _, _, course, _ = setup_waitlist
    coordinator_user = UserFactory.create_batch(1)[0]
    _ = CoordinatorFactory.create(user=coordinator_user, course=course)

    client.force_login(coordinator_user)
    response = client.patch("/api/waitlist/999/drop/")

    assert response.data["detail"] == "Student is not on the waitlist for this section"
    assert response.status_code == 404


@pytest.mark.django_db
def test_positions_update_properly():
    """
    Given a waitlist with existing students,
    When a coordinator adds a student on the waitlist at a certain position,
    The waitlist students have the correct order.
    """
    return True
