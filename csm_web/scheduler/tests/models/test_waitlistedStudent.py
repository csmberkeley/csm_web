import pytest
from scheduler.factories import (
    CourseFactory,
    MentorFactory,
    SectionFactory,
    UserFactory,
)
from scheduler.models import WaitlistedStudent


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
