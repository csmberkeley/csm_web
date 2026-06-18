from datetime import timedelta

import pytest
from django.utils import timezone
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
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=3)
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
    response = client.put(f"/api/waitlist/{section.pk}/add/")

    assert response.status_code == 403
    assert response.data["detail"] == "Mentors cannot waitlist in a course they mentor."
    assert WaitlistedStudent.objects.count() == 0

    client.force_login(user)
    response = client.put(f"/api/waitlist/{section.pk}/add/")  # should auto enroll user
    assert WaitlistedStudent.objects.count() == 0
    assert Student.objects.count() == 1

    client.force_login(user)
    response = client.put(
        f"/api/waitlist/{section.pk}/add/"
    )  # fails because user is in section
    assert response.status_code == 403
    assert response.data["detail"] == "User is already enrolled in this section."
    assert WaitlistedStudent.objects.count() == 0


@pytest.mark.django_db
def test_user_can_waitlist_only_once(setup_waitlist, client):
    """
    Given a user already on the waitlist for a section,
    When they attempt to join the same waitlist again,
    Then they are denied with an appropriate error.
    """
    _, waitlisted_student_user, _, section = setup_waitlist

    while not section.is_section_full:
        new_student = UserFactory.create_batch(1)[0]
        client.force_login(new_student)
        response = client.put(f"/api/waitlist/{section.pk}/add/")

    client.force_login(waitlisted_student_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/add/", content_type="application/json"
    )

    assert response.status_code == 201
    assert WaitlistedStudent.objects.count() == 1

    client.force_login(waitlisted_student_user)
    response = client.put(f"/api/waitlist/{section.pk}/add/")

    assert response.status_code == 403
    assert response.data["detail"] == "User is already waitlisted in this section."
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
        response = client.put(
            f"/api/waitlist/{section.pk}/add/", content_type="application/json"
        )

    client.force_login(waitlisted_student_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/add/", content_type="application/json"
    )

    assert response.status_code == 403
    assert response.data["detail"] == "There is no space available in this waitlist."
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
        section_test = SectionFactory.create(
            mentor=mentor, capacity=1, waitlist_capacity=1
        )

        while not section_test.is_section_full:
            new_student = UserFactory.create_batch(1)[0]
            client.force_login(new_student)
            response = client.put(
                f"/api/waitlist/{section_test.pk}/add/",
                content_type="application/json",
            )

        client.force_login(waitlisted_student_user)
        response = client.put(
            f"/api/waitlist/{section_test.pk}/add/", content_type="application/json"
        )
    # Verify max waitlists achieved
    assert WaitlistedStudent.objects.count() == course.max_waitlist_enroll

    while not section.is_section_full:
        new_student = UserFactory.create_batch(1)[0]
        client.force_login(new_student)
        response = client.put(
            f"/api/waitlist/{section.pk}/add/", content_type="application/json"
        )

    # Verify errors when attempting to add another waitlist
    client.force_login(waitlisted_student_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/add/", content_type="application/json"
    )
    assert response.status_code == 403
    assert WaitlistedStudent.objects.count() == course.max_waitlist_enroll

    # Check if user is dropped from all waitlists for a course when adding to a course section
    mentor_user = UserFactory.create_batch(1)[0]
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section_test = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=1)

    client.force_login(waitlisted_student_user)
    response = client.put(
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
    section2 = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=3)

    # Add user to both waitlists
    for _ in range(section1.capacity):
        test_user = UserFactory.create_batch(1)[0]
        client.force_login(test_user)
        _ = client.put(f"/api/waitlist/{section1.pk}/add/")

    for _ in range(section2.capacity):
        test_user = UserFactory.create_batch(1)[0]
        client.force_login(test_user)
        _ = client.put(f"/api/waitlist/{section2.pk}/add/")

    client.force_login(waitlisted_student_user)
    _ = client.put(f"/api/waitlist/{section1.pk}/add/", content_type="application/json")
    _ = client.put(f"/api/waitlist/{section2.pk}/add/", content_type="application/json")
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
def test_enrolled_student_swaps_to_open_section(client):
    """
    Given a student enrolled in section A,
    When they try to add to section B which has room,
    Then they are swapped: dropped from A and enrolled in B.
    """
    course = CourseFactory.create()
    mentor_user1 = UserFactory.create()
    mentor1 = MentorFactory.create(course=course, user=mentor_user1)
    section1 = SectionFactory.create(mentor=mentor1, capacity=2, waitlist_capacity=3)

    mentor_user2 = UserFactory.create()
    mentor2 = MentorFactory.create(course=course, user=mentor_user2)
    section2 = SectionFactory.create(mentor=mentor2, capacity=2, waitlist_capacity=3)

    enrolled_user = UserFactory.create()
    Student.objects.create(user=enrolled_user, course=course, section=section1)

    client.force_login(enrolled_user)
    response = client.put(
        f"/api/waitlist/{section2.pk}/add/", data={}, content_type="application/json"
    )

    assert response.status_code == 200
    # User should now be in section2, not section1
    active_student = Student.objects.filter(user=enrolled_user, active=True).first()
    assert active_student is not None
    assert active_student.section == section2
    assert (
        Student.objects.filter(
            user=enrolled_user, active=True, section=section1
        ).count()
        == 0
    )
    # No waitlist entries should exist
    assert (
        WaitlistedStudent.objects.filter(user=enrolled_user, active=True).count() == 0
    )


@pytest.mark.django_db
def test_enrolled_student_can_waitlist_other_section(client):
    """
    Given a student enrolled in a section,
    When they waitlist for another section in the same course,
    Then they are allowed to waitlist.
    """
    course = CourseFactory.create()
    mentor_user1 = UserFactory.create()
    mentor1 = MentorFactory.create(course=course, user=mentor_user1)
    section1 = SectionFactory.create(mentor=mentor1, capacity=1, waitlist_capacity=3)

    mentor_user2 = UserFactory.create()
    mentor2 = MentorFactory.create(course=course, user=mentor_user2)
    section2 = SectionFactory.create(mentor=mentor2, capacity=1, waitlist_capacity=3)

    enrolled_user = UserFactory.create()
    Student.objects.create(user=enrolled_user, course=course, section=section1)

    other_user = UserFactory.create()
    Student.objects.create(user=other_user, course=course, section=section2)

    client.force_login(enrolled_user)
    response = client.put(
        f"/api/waitlist/{section2.pk}/add/", data={}, content_type="application/json"
    )

    assert response.status_code == 201
    assert WaitlistedStudent.objects.filter(
        user=enrolled_user, section=section2, active=True
    ).exists()


@pytest.mark.django_db
def test_waitlist_promotion_swaps_section(client):
    """
    Given a student is enrolled in section A and waitlisted in section B,
    When a spot opens in section B,
    Then the student is swapped into section B and removed from section A.
    """
    course = CourseFactory.create()
    mentor_user1 = UserFactory.create()
    mentor1 = MentorFactory.create(course=course, user=mentor_user1)
    section1 = SectionFactory.create(mentor=mentor1, capacity=1, waitlist_capacity=3)

    mentor_user2 = UserFactory.create()
    mentor2 = MentorFactory.create(course=course, user=mentor_user2)
    section2 = SectionFactory.create(mentor=mentor2, capacity=1, waitlist_capacity=3)

    enrolled_user = UserFactory.create()
    Student.objects.create(user=enrolled_user, course=course, section=section1)

    other_user = UserFactory.create()
    other_student = Student.objects.create(
        user=other_user, course=course, section=section2
    )

    client.force_login(enrolled_user)
    response = client.put(
        f"/api/waitlist/{section2.pk}/add/", data={}, content_type="application/json"
    )
    assert response.status_code == 201

    client.force_login(other_user)
    _ = client.patch(f"/api/students/{other_student.pk}/drop/")

    active_student = Student.objects.filter(user=enrolled_user, active=True).first()
    assert active_student is not None
    assert active_student.section == section2
    assert (
        Student.objects.filter(
            user=enrolled_user, active=True, section=section1
        ).count()
        == 0
    )
    assert (
        WaitlistedStudent.objects.filter(user=enrolled_user, active=True).count() == 0
    )


@pytest.mark.django_db
def test_waitlist_cascades_to_previous_section(client):
    """
    Given a student swaps from section A to section B via waitlist,
    When they leave section A,
    Then section A's waitlist is promoted as well.
    """
    course = CourseFactory.create()
    mentor_user1 = UserFactory.create()
    mentor1 = MentorFactory.create(course=course, user=mentor_user1)
    section1 = SectionFactory.create(mentor=mentor1, capacity=1, waitlist_capacity=3)

    mentor_user2 = UserFactory.create()
    mentor2 = MentorFactory.create(course=course, user=mentor_user2)
    section2 = SectionFactory.create(mentor=mentor2, capacity=1, waitlist_capacity=3)

    enrolled_user = UserFactory.create()
    Student.objects.create(user=enrolled_user, course=course, section=section1)

    waitlisted_user = UserFactory.create()
    client.force_login(waitlisted_user)
    _ = client.put(
        f"/api/waitlist/{section1.pk}/add/", data={}, content_type="application/json"
    )

    other_user = UserFactory.create()
    other_student = Student.objects.create(
        user=other_user, course=course, section=section2
    )

    client.force_login(enrolled_user)
    _ = client.put(
        f"/api/waitlist/{section2.pk}/add/", data={}, content_type="application/json"
    )

    client.force_login(other_user)
    _ = client.patch(f"/api/students/{other_student.pk}/drop/")

    promoted_student = Student.objects.filter(
        user=waitlisted_user, active=True, section=section1
    ).first()
    assert promoted_student is not None


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

    assert response.status_code == 204
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
    When new students are added and dropped,
    Positions are auto-assigned as max+1 and gaps are left after drops
    (rank is computed at query time, not by compacting).
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=5, waitlist_capacity=5)

    # Create 3 waitlisted students (positions auto-assigned as 1, 2, 3)
    user1 = UserFactory.create()
    ws1 = WaitlistedStudent.objects.create(user=user1, course=course, section=section)
    user2 = UserFactory.create()
    ws2 = WaitlistedStudent.objects.create(user=user2, course=course, section=section)
    user3 = UserFactory.create()
    ws3 = WaitlistedStudent.objects.create(user=user3, course=course, section=section)

    ws1.refresh_from_db()
    ws2.refresh_from_db()
    ws3.refresh_from_db()

    assert ws1.position == 1
    assert ws2.position == 2
    assert ws3.position == 3

    # Drop ws2; positions are NOT compacted — ws1 stays 1, ws3 stays 3
    ws2.active = False
    ws2.save()

    ws1.refresh_from_db()
    ws3.refresh_from_db()

    assert ws1.position == 1
    assert ws3.position == 3

    # Add a new student; should get max(1,3) + 1 = 4
    user4 = UserFactory.create()
    ws4 = WaitlistedStudent.objects.create(user=user4, course=course, section=section)
    ws4.refresh_from_db()

    assert ws4.position == 4


@pytest.mark.django_db
def test_waitlist_respects_priority_enrollment(client):
    """
    Given a course that is not open for enrollment yet,
    When a user has priority enrollment in the window,
    Then they can still waitlist.
    """
    now = timezone.now()
    course = CourseFactory.create(
        enrollment_start=now + timedelta(days=7),
        enrollment_end=now + timedelta(days=14),
        section_start=(now + timedelta(days=8)).date(),
        valid_until=(now + timedelta(days=30)).date(),
    )
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=3)

    # Fill section to force waitlist
    other_user = UserFactory.create()
    Student.objects.create(user=other_user, course=course, section=section)

    user = UserFactory.create()
    user.priority_enrollment = now - timedelta(days=1)
    user.save()

    client.force_login(user)
    response = client.put(
        f"/api/waitlist/{section.pk}/add/", data={}, content_type="application/json"
    )

    assert response.status_code == 201
    assert WaitlistedStudent.objects.filter(
        user=user, section=section, active=True
    ).exists()


@pytest.mark.django_db
def test_waitlist_denied_outside_enrollment_window(client):
    """
    Given a course that is not open for enrollment and no priority enrollment,
    When a user attempts to waitlist,
    Then they are denied.
    """
    now = timezone.now()
    course = CourseFactory.create(
        enrollment_start=now + timedelta(days=7),
        enrollment_end=now + timedelta(days=14),
        section_start=(now + timedelta(days=8)).date(),
        valid_until=(now + timedelta(days=30)).date(),
    )
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=3)

    other_user = UserFactory.create()
    Student.objects.create(user=other_user, course=course, section=section)

    user = UserFactory.create()
    client.force_login(user)
    response = client.put(
        f"/api/waitlist/{section.pk}/add/", data={}, content_type="application/json"
    )

    assert response.status_code == 403
    assert response.data["detail"] == "User cannot waitlist in this course."


@pytest.mark.django_db
def test_waitlist_restricted_course_requires_whitelist(client):
    """
    Given a restricted course without whitelist access,
    When a user attempts to waitlist,
    Then they are denied.
    """
    course = CourseFactory.create(is_restricted=True)
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=3)

    other_user = UserFactory.create()
    Student.objects.create(user=other_user, course=course, section=section)

    user = UserFactory.create()
    client.force_login(user)
    response = client.put(
        f"/api/waitlist/{section.pk}/add/", data={}, content_type="application/json"
    )

    assert response.status_code == 403
    assert response.data["detail"] == "User cannot waitlist in this course."


@pytest.mark.django_db
def test_coord_add_requires_coordinator(client):
    """
    Given a non-coordinator user,
    When they attempt to add a student to a waitlist via coord endpoint,
    Then they are denied.
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor)

    non_coord_user = UserFactory.create()
    client.force_login(non_coord_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/coordadd/",
        data={"emails": [{"email": "test@berkeley.edu"}]},
        content_type="application/json",
    )

    assert response.status_code == 403
    assert response.data["detail"] == "You must be a coord to perform this action."


@pytest.mark.django_db
def test_waitlist_count_endpoint(client):
    """
    Given a section with waitlisted students,
    When the count endpoint is requested,
    Then it returns the waitlist count.
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor)

    user = UserFactory.create()
    WaitlistedStudent.objects.create(user=user, course=course, section=section)

    client.force_login(user)
    response = client.get(
        f"/api/waitlist/{section.pk}/count_waitlist/",
        HTTP_ACCEPT="application/json",
    )

    assert response.status_code == 200
    assert int(response.content.decode("utf-8")) == 1


@pytest.mark.django_db
def test_position_endpoint_returns_rank(client):
    """
    Given a waitlist with gaps in position numbers,
    When a user requests their position,
    Then the endpoint returns the 1-indexed rank (count of active students
    with lower positions + 1), not the raw position value.
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=5)

    # Fill the section so users are forced onto the waitlist
    filler_user = UserFactory.create()
    Student.objects.create(user=filler_user, course=course, section=section)

    # Create 3 waitlisted students (positions 1, 2, 3)
    user1 = UserFactory.create()
    WaitlistedStudent.objects.create(user=user1, course=course, section=section)
    user2 = UserFactory.create()
    ws2 = WaitlistedStudent.objects.create(user=user2, course=course, section=section)
    user3 = UserFactory.create()
    WaitlistedStudent.objects.create(user=user3, course=course, section=section)

    # Verify initial ranks
    client.force_login(user1)
    response = client.get(f"/api/waitlist/{section.pk}/position/")
    assert response.status_code == 200
    assert response.data["position"] == 1

    client.force_login(user3)
    response = client.get(f"/api/waitlist/{section.pk}/position/")
    assert response.status_code == 200
    assert response.data["position"] == 3

    # Drop user2 — creates a gap (positions 1, _, 3)
    ws2.active = False
    ws2.save()

    # user3's rank should now be 2 (only user1 has a lower position)
    client.force_login(user3)
    response = client.get(f"/api/waitlist/{section.pk}/position/")
    assert response.status_code == 200
    assert response.data["position"] == 2

    # A user not on the waitlist gets 404
    non_waitlisted = UserFactory.create()
    client.force_login(non_waitlisted)
    response = client.get(f"/api/waitlist/{section.pk}/position/")
    assert response.status_code == 404


@pytest.mark.django_db
def test_coord_add_success_and_mixed_results(client):
    """
    Given a coordinator adding students by email,
    When some emails succeed and some are already enrolled,
    Then the response reports per-email status and returns 422 on errors.
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=2, waitlist_capacity=3)

    coord_user = UserFactory.create()
    CoordinatorFactory.create(user=coord_user, course=course)

    # Successful add — section has room, so user gets enrolled
    client.force_login(coord_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/coordadd/",
        data={"emails": [{"email": "new_student@berkeley.edu"}]},
        content_type="application/json",
    )
    assert response.status_code == 200

    # Add the same email again — should conflict
    client.force_login(coord_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/coordadd/",
        data={"emails": [{"email": "new_student@berkeley.edu"}]},
        content_type="application/json",
    )
    assert response.status_code == 422
    assert response.data["progress"][0]["status"] == "CONFLICT"

    # Mixed batch — one new, one duplicate
    client.force_login(coord_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/coordadd/",
        data={
            "emails": [
                {"email": "another_student@berkeley.edu"},
                {"email": "new_student@berkeley.edu"},
            ]
        },
        content_type="application/json",
    )
    assert response.status_code == 422
    statuses = [r["status"] for r in response.data["progress"]]
    assert statuses == ["OK", "CONFLICT"]

    # Empty emails returns 422
    client.force_login(coord_user)
    response = client.put(
        f"/api/waitlist/{section.pk}/coordadd/",
        data={"emails": []},
        content_type="application/json",
    )
    assert response.status_code == 422


@pytest.mark.django_db
def test_view_waitlist_permissions(client):
    """
    Given a section with a waitlist,
    When different users request the waitlist view,
    Then only the mentor and coordinators are allowed to see it.
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=3)

    # Fill section so next user gets waitlisted
    filler_user = UserFactory.create()
    Student.objects.create(user=filler_user, course=course, section=section)

    waitlisted_user = UserFactory.create()
    WaitlistedStudent.objects.create(
        user=waitlisted_user, course=course, section=section
    )

    # Mentor can view
    client.force_login(mentor_user)
    response = client.get(f"/api/waitlist/{section.pk}/")
    assert response.status_code == 200
    assert len(response.data) == 1

    # Coordinator can view
    coord_user = UserFactory.create()
    CoordinatorFactory.create(user=coord_user, course=course)
    client.force_login(coord_user)
    response = client.get(f"/api/waitlist/{section.pk}/")
    assert response.status_code == 200
    assert len(response.data) == 1

    # Random user cannot view
    random_user = UserFactory.create()
    client.force_login(random_user)
    response = client.get(f"/api/waitlist/{section.pk}/")
    assert response.status_code == 403


@pytest.mark.django_db
def test_drop_preserves_position():
    """
    Given a waitlisted student with an assigned position,
    When they are dropped,
    Then the position value is preserved (not cleared to None).
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=5, waitlist_capacity=5)

    user = UserFactory.create()
    ws = WaitlistedStudent.objects.create(user=user, course=course, section=section)
    ws.refresh_from_db()
    assert ws.position == 1

    ws.active = False
    ws.save()
    ws.refresh_from_db()

    assert ws.active is False
    assert ws.position == 1  # position preserved, not cleared


@pytest.mark.django_db
def test_waitlist_promotion_drops_failed_student(client):
    """
    Given a student on a waitlist,
    When they are promoted but fail to enroll (e.g. because they became a mentor),
    Then they are removed from the waitlist and the next student is promoted.
    """
    course = CourseFactory.create()
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=2)

    # Fill section
    enrolled_user = UserFactory.create()
    Student.objects.create(user=enrolled_user, course=course, section=section)

    # Waitlist student 1
    fail_user = UserFactory.create()
    ws1 = WaitlistedStudent.objects.create(
        user=fail_user, course=course, section=section
    )

    # Waitlist student 2
    success_user = UserFactory.create()
    ws2 = WaitlistedStudent.objects.create(
        user=success_user, course=course, section=section
    )

    # Make student 1 fail to enroll by making them a mentor for the course with a section
    mentor2 = MentorFactory.create(course=course, user=fail_user)
    SectionFactory.create(mentor=mentor2, capacity=1)

    # Now drop the enrolled user to trigger waitlist promotion
    client.force_login(enrolled_user)
    student_obj = enrolled_user.student_set.first()
    response = client.patch(f"/api/students/{student_obj.pk}/drop/")
    assert response.status_code == 204

    # Waitlist student 1 should be dropped from waitlist
    ws1.refresh_from_db()
    assert not ws1.active

    # Waitlist student 2 should be enrolled
    ws2.refresh_from_db()
    assert not ws2.active  # waitlisted student object is deactivated
    assert Student.objects.filter(
        user=success_user, section=section, active=True
    ).exists()


@pytest.mark.django_db
def test_coordinator_add_cleans_waitlists_and_promotes(client):
    """
    Test that the coordinator bulk add tool correctly handles cascading waitlist logic:
    1. Student S is in Section A and waitlisted in Section C.
    2. Student W is waitlisted in Section A.
    3. Coordinator moves Student S to Section B.
    4. Student S should be removed from Section C's waitlist.
    5. Student W should be promoted to Section A.
    """
    course = CourseFactory.create()
    coord_user = UserFactory.create()
    CoordinatorFactory.create(course=course, user=coord_user)

    mentor_a = MentorFactory.create(course=course)
    section_a = SectionFactory.create(mentor=mentor_a, capacity=1)

    mentor_b = MentorFactory.create(course=course)
    section_b = SectionFactory.create(mentor=mentor_b, capacity=1)

    mentor_c = MentorFactory.create(course=course)
    section_c = SectionFactory.create(mentor=mentor_c, capacity=1)

    # 1. Student S is in Section A
    s_user = UserFactory.create()
    s_student = Student.objects.create(user=s_user, section=section_a, course=course)

    # Student S is waitlisted in Section C
    ws_c = WaitlistedStudent.objects.create(
        user=s_user, section=section_c, course=course
    )

    # 2. Student W is waitlisted in Section A
    w_user = UserFactory.create()
    ws_a = WaitlistedStudent.objects.create(
        user=w_user, section=section_a, course=course
    )

    # 3. Coordinator moves Student S to Section B
    client.force_login(coord_user)
    payload = {
        "emails": [{"email": s_user.email, "conflict_action": "DROP"}],
        "actions": {},
    }
    response = client.put(
        f"/api/sections/{section_b.id}/students/",
        data=payload,
        content_type="application/json",
    )
    assert response.status_code == 200

    # 4. Student S should be moved to Section B and no longer in Section A
    s_student.refresh_from_db()
    assert s_student.section == section_b
    assert s_student.active is True
    assert (
        Student.objects.filter(user=s_user, section=section_a, active=True).count() == 0
    )

    # 5. Student S should be removed from Section C's waitlist
    ws_c.refresh_from_db()
    assert ws_c.active is False

    # 6. Student W should be promoted to Section A
    ws_a.refresh_from_db()
    assert ws_a.active is False
    assert Student.objects.filter(user=w_user, section=section_a, active=True).exists()
