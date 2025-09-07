import pytest

from django.core.exceptions import ValidationError
from scheduler.models import Student, User
from scheduler.factories import UserFactory, CourseFactory, SectionFactory, StudentFactory, MentorFactory


@pytest.mark.django_db
def test_create_student():
    mentor_user, student_user = UserFactory.create_batch(2)
    course = CourseFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor)

    student = Student.objects.create(user=student_user, course=course, section=section)
    assert student.user == student_user
    assert Student.objects.count() == 1
    assert Student.objects.get(user=student_user).user == student_user

    assert student.course == course
    assert student.section == section
    assert student.section.mentor.user == mentor_user
    assert student.section.mentor.course == course
    assert student.section.mentor.section == section

    assert student.section.students.count() == 1
    assert student.section.current_student_count == 1


@pytest.mark.django_db
def test_create_duplicate_student():
    mentor_user, student_user = UserFactory.create_batch(2)
    course = CourseFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor)

    student = Student.objects.create(user=student_user, course=course, section=section)
    assert student.user == student_user

    # should not be able to create a student for the same section twice
    with pytest.raises(
        ValidationError, match="Student with this User and Section already exists."
    ):
        Student.objects.create(
            user=student_user,
            course=course,
            section=section,
        )
