import pytest
import json 

from django.urls import reverse
from django.core.exceptions import ValidationError
from scheduler.models import Student, User, Swap
from scheduler.factories import UserFactory, CourseFactory, SectionFactory, StudentFactory, MentorFactory

@pytest.fixture
def setup_section(db):
    """
    Creates a pair of sections within the same course, each with a mentor and student.
    """
    # Setup course
    course = CourseFactory.create()
    # Setup test section one
    mentor_user_one, student_user_one = UserFactory.create_batch(2)
    mentor_one = MentorFactory.create(course=course, user=mentor_user_one)
    section_one = SectionFactory.create(mentor=mentor_one)
    student_one = StudentFactory.create(user=student_user_one, course=course, section=section_one)
    # Setup test section two
    mentor_user_two, student_user_two = UserFactory.create_batch(2)
    mentor_two = MentorFactory.create(course=course, user=mentor_user_two)
    section_two = SectionFactory.create(mentor=mentor_two)
    student_two = StudentFactory.create(user=student_user_two, course=course, section=section_two)

    return course, section_one, section_two, student_one, student_two


@pytest.mark.django_db
def test_basic_swap_request_success(client, setup_section):
    """
    Tests that a student can successfully request a swap.
    """
    # TODO: Add test for when a student successfully requests a swap from another student in a different section
    section_one, section_two, student_one, student_two = setup_section[1:]
    client.force_login(student_one.user)
    post_url = reverse("section-swap", args=[section_one.id]) 
    data = json.dumps({"receiver_email": student_two.user.email, "student_id": student_one.id})
    response = client.post(post_url, data=data, content_type="application/json")

    # Check that the swap request was created
    assert Swap.objects.filter(receiver=student_two).exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    ["email"],
    [
        # empty email
        (" ",),
        # invalid email
        ("invalid",),
        # non-existent email
        ("abcd@example.io",),
        # valid email
        (setup_section,)
    ],
    ids=["empty email", "invalid email", "non-existent email", "valid email"],
)
def test_request_swap_invalid_email(client, setup_section, email, request):
    """
    Tests that a student cannot request a swap with an invalid email.
    """
    course, section_one, section_two, student_one, student_two = setup_section
    receiver_email = email
    if (type(receiver_email) != str):
        receiver_email = request.getfixturevalue(email.__name__)[4].user.email
    # TODO Add test for when a student requests a swap with a invalid email
    


@pytest.mark.django_db
def test_swap_with_stale_receiver(client, setup_section):
    """
    Tests weather Swaps are being invalidated/deleted when receiver has swapped with another student. 
    """
    # TODO Add test for when a student requests a swap with a stale receiver
