import pytest
from django.core.exceptions import ValidationError
from scheduler.factories import (
    CourseFactory,
    MentorFactory,
    SectionFactory,
    SpacetimeFactory,
    UserFactory,
)
from scheduler.models import WaitlistedStudent, Section, Student, User

@pytest.mark.django_db
def test_create_waitlisted_student():
    mentor_user, waitlisted_student_user = UserFactory.create_batch(2)
    course = CourseFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor)
    waitlisted_student = WaitlistedStudent.objects.create(user=waitlisted_student_user, course=course, section=section)

    assert waitlisted_student.user == waitlisted_student_user
    assert WaitlistedStudent.objects.count() == 1
    assert WaitlistedStudent.objects.get(user=waitlisted_student_user).user == waitlisted_student_user

    assert waitlisted_student.course == course
    assert waitlisted_student.section == section
    assert waitlisted_student.section.mentor.user == mentor_user
    assert waitlisted_student.section.mentor.course == course
    assert waitlisted_student.section.mentor.section == section

    assert waitlisted_student.section.students.count() == 1
    assert waitlisted_student.section.current_student_count == 1