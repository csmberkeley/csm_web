import pytest
from rest_framework import status
from scheduler.models import WaitlistPosition
from scheduler.factories import StudentFactory, SectionFactory, CoordinatorFactory

# Test adding a student to the waitlist
@pytest.mark.django_db
def test_add_student_to_waitlist():
    student = StudentFactory.create()
    section = SectionFactory.create(waitlist_capacity=5)

    response = add(student=student.id, section=section.id)

    assert response.status_code == status.HTTP_201_CREATED
    assert WaitlistPosition.objects.count() == 1
    assert WaitlistPosition.objects.get(student=student).section == section

# Test adding a student to a full waitlist
@pytest.mark.django_db
def test_add_student_to_full_waitlist():
    student = StudentFactory.create()
    section = SectionFactory.create(waitlist_capacity=0)

    response = add(student=student.id, section=section.id)

    assert response.status_code == status.HTTP_409_CONFLICT
    assert WaitlistPosition.objects.count() == 0

# Test dropping a student from the waitlist
@pytest.mark.django_db
def test_drop_student_from_waitlist():
    student = StudentFactory.create()
    section = SectionFactory.create(waitlist_capacity=5)
    waitlist_position = WaitlistPosition.objects.create(student=student, section=section)

    response = drop(student=student.id, section=section.id)

    assert response.status_code == status.HTTP_200_OK
    assert WaitlistPosition.objects.count() == 0

# Test dropping a student from the waitlist by a coordinator
@pytest.mark.django_db
def test_coordinator_drop_student_from_waitlist():
    student = StudentFactory.create()
    section = SectionFactory.create(waitlist_capacity=5)
    coordinator = CoordinatorFactory.create(course=section.course)
    waitlist_position = WaitlistPosition.objects.create(student=student, section=section)

    response = drop(student=student.id, section=section.id, requestor=coordinator.user)

    assert response.status_code == status.HTTP_200_OK
    assert WaitlistPosition.objects.count() == 0

# Test getting the waitlist for a section
@pytest.mark.django_db
def test_get_waitlist_for_section():
    section = SectionFactory.create(waitlist_capacity=5)
    student1 = StudentFactory.create()
    student2 = StudentFactory.create()
    waitlist_position1 = WaitlistPosition.objects.create(student=student1, section=section)
    waitlist_position2 = WaitlistPosition.objects.create(student=student2, section=section)

    response = get(section=section.id)

    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2
    assert response.data[0]['student'] == student1.id
    assert response.data[1]['student'] == student2.id