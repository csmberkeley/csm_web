import pytest

from django.core.exceptions import ValidationError
from django.urls import reverse
from scheduler.models import Student, User
from scheduler.factories import UserFactory, CourseFactory, SectionFactory, StudentFactory, MentorFactory, CoordinatorFactory


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

@pytest.mark.django_db
def test_student_names(client):
    mentor_user = UserFactory.create()
    course = CourseFactory.create()
    mentor = MentorFactory.create(course=course, user=mentor_user)
    section = SectionFactory.create(mentor=mentor)
    students = StudentFactory.create_batch(5, section=section, course=course)
    coord = CoordinatorFactory.create(course=course)

    client.force_login(coord.user)
    url = reverse("student-student-names")
    response = client.get(url)
    print(response.data)
    assert len(response.data) == 5 and type(response.data[0]) == str

    client.force_login(students[0].user)
    url = reverse("student-student-names")
    response = client.get(url)
    assert response.status_code == 403