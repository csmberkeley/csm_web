import pytest
from freezegun import freeze_time
from unittest import mock
import factory
import faker
import datetime
from rest_framework import status
import scheduler


from django.utils import timezone
from django.urls import reverse
from scheduler.models import (
    User,
    Course,
    Section,
    Mentor,
    Student,
    Attendance,
    SectionOccurrence,
    Label
)
from scheduler.factories import (
    UserFactory,
    CourseFactory,
    SectionFactory,
    MentorFactory,
    StudentFactory,
    AttendanceFactory,
    SpacetimeFactory,
    LabelFactory,
    CoordinatorFactory
)

import zoneinfo


@pytest.fixture
def setup_section(db):
    mentor_user = UserFactory.create(
        username="mentor_user", first_name="mentor", last_name="user"
    )
    student_user = UserFactory.create(
        username="student_user", first_name="student", last_name="user"
    )
    coordinator_user = UserFactory.create(
        username="coordinator_user", first_name="coordinator", last_name="user"
    )
    course = CourseFactory.create(
        name="course",
        title="title for course"
    )
    mentor = MentorFactory.create(user=mentor_user, course=course)
    coordinator = CoordinatorFactory.create(user=coordinator_user, course=course)
    labels = LabelFactory.create_batch(
        size=10,
        course=course
    )
    section = SectionFactory.create(
        mentor=mentor,
        capacity=6,
    )
    for label in labels:
        section.label_set.add(label)
    section.save()
    return mentor_user, student_user, coordinator_user, course, section, labels


@pytest.mark.django_db
def test_student_forbidden(client, setup_section):
    mentor_user, student_user, coordinator_user, course, section, labels = setup_section
    client.force_login(student_user)
    # enroll the student
    enroll_url = reverse("section-students", kwargs={"pk": section.pk})
    print(enroll_url)
    client.put(enroll_url)

    label_add_url = reverse("section-detail", kwargs={"pk": section.pk})
    print(label_add_url)
    response = client.patch(label_add_url, data={
        'capacity': 4,
        'selected_labels': [1]
    }, content_type='application/json')
    print(response.content)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_mentor_forbidden(client, setup_section):
    mentor_user, student_user, coordinator_user, course, section, labels = setup_section
    client.force_login(mentor_user)
    label_add_url = reverse("section-detail", kwargs={"pk": section.pk})
    print(label_add_url)
    response = client.patch(label_add_url, data={
        'capacity': 4,
        'selected_labels': [1]
    }, content_type='application/json')
    print(response.content)
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_coordinator_allowed(client, setup_section):
    mentor_user, student_user, coordinator_user, course, section, labels = setup_section
    client.force_login(coordinator_user)
    for label in labels:
        label_add_url = reverse("section-detail", kwargs={"pk": section.pk})
        response = client.patch(label_add_url, data={
            'capacity': 4,
            'selected_labels': [label.id]
        }, content_type='application/json')
        assert response.status_code == status.HTTP_202_ACCEPTED


# test for whether deletion of a section reflects itself in the many-to-many field of the labels that the section had
# @pytest.mark.django_db
# def test_section_deletion(client, setup_section):


# @pytest.mark.django_db
# def test_attendance_drop_student_on_day(
#     client, setup_section
# ):
#     mentor, student_user, course, section = setup_section

#     # enroll student first
#     with freeze_time(timezone.datetime(2020, 6, 1, 0, 0, 0, tzinfo=DEFAULT_TZ)):
#         client.force_login(student_user)
#         enroll_url = reverse("section-students", kwargs={"pk": section.pk})
#         client.put(enroll_url)

#     # now drop the student
#     with freeze_time(day):
#         client.force_login(student_user)
#         student = Student.objects.get(user=student_user)
#         drop_url = reverse("student-drop", kwargs={"pk": student.pk})
#         client.patch(drop_url)

#         # refresh student object
#         student.refresh_from_db()

#         # make sure student is no longer enrolled in section
#         assert student.active is False
#         assert section.current_student_count == 0
#         # student should still be associated with the section though
#         assert section.students.count() == 1

#         # make sure section occurrence objects are still there
#         assert SectionOccurrence.objects.filter(section=section).count() == 2

#         # make sure attendance objects have been deleted
#         assert student.attendance_set.count() == num_attendances_left
