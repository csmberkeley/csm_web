import pytest
import json 

from django.urls import reverse
from django.core.exceptions import ValidationError
from scheduler.models import (
    Student, 
    User, 
    Swap
)
from scheduler.factories import (
    UserFactory, 
    CourseFactory, 
    SectionFactory, 
    StudentFactory, 
    MentorFactory
)


@pytest.fixture
def setup_scheduler(db):
    """
    Creates a pair of sections within the same course, each with a mentor and student.
    """
    # Setup course
    course = CourseFactory.create()
    # Setup sections
    section_one = create_section(course)
    section_two = create_section(course)
    # Setup students
    section_one_students = create_students(course, section_one, 3)
    section_two_students = create_students(course, section_two, 3)

    return course, section_one, section_two, section_one_students, section_two_students


@pytest.mark.django_db
def test_basic_swap_request_success(client, setup_scheduler):
    """
    Tests that a student can successfully request a swap.
    """
    section_one, section_two, section_one_students, section_two_students = setup_scheduler[1:]
    sender_student, reciever_student = section_one_students[0], section_two_students[0]
    # Create a swap request
    create_swap_request(client, sender_student, reciever_student)
    # Make sure that the swap request was created
    assert Swap.objects.filter(receiver=reciever_student).exists()
    

@pytest.mark.django_db
@pytest.mark.parametrize(
    ["is_empty"],
    [
        # expect empty swap list
        (True,),
        # expect non-empty swap list
        (False,),
    ],
    ids=["empty swap list", "non-empty swap list"],
)
def test_basic_swap_get(client, setup_scheduler, is_empty):
    """
    Tests getting a list of swaps for a student
    """
    section_one, section_two, section_one_students, section_two_students = setup_scheduler[1:]
    sender_student, reciever_student = section_one_students[0], section_two_students[0]
    if not is_empty:
        # Create a swap request
        create_swap_request(client, sender_student, reciever_student)
    # Get the list of swaps for the reciever
    swaps = get_swap_requests(client, sender_student)
    # Decode get response to UTF-8
    swaps = json.loads(swaps.content.decode("utf-8"))
    if not is_empty:
        # Make sure that the swap request was created
        assert Swap.objects.filter(receiver=reciever_student).exists()
        # Make sure that the swap request is in the list of swaps
        assert len(swaps["sender"]) != 0 and swaps["sender"][0]["receiver"] == reciever_student.id
    else:
        assert len(swaps["sender"]) == 0


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
        (setup_scheduler,)
    ],
    ids=["empty email", "invalid email", "non-existent email", "valid email"],
)
def test_request_swap_invalid_email(client, setup_scheduler, email, request):
    """
    Tests that a student cannot request a swap with an invalid email.
    """
    course, section_one, section_two, section_one_students, section_two_students = setup_scheduler 
    receiver_email = email
    if (type(receiver_email) != str):
        receiver_email = request.getfixturevalue(email.__name__)[4][0].user.email
    # TODO Add test for when a student requests a swap with a invalid email 


@pytest.mark.django_db
def test_swap_with_stale_receiver(client, setup_scheduler):
    """
    Tests weather Swaps are being invalidated/deleted when receiver has swapped with another student. 
    """
    # TODO Add test for when a student requests a swap with a stale receiver


def create_students(course, section, quantity):
    """
    Creates a given number of students for a given section.
    """
    student_users = UserFactory.create_batch(quantity)
    students = []
    for student_user in student_users:
        student = StudentFactory.create(user=student_user, course=course, section=section)
        students.append(student)
    return students


def create_section(course):
    """
    Creates a section for a given course.
    """
    mentor_user = UserFactory.create()
    mentor = MentorFactory.create(user=mentor_user, course=course)
    section = SectionFactory.create(mentor=mentor)
    return section


def create_swap_request(client, sender, reciever):
    """
    Creates a swap request between two students.
    """
    client.force_login(sender.user)
    post_url = reverse("section-swap", args=[sender.section.id]) 
    data = json.dumps({"receiver_email": reciever.user.email, "student_id": sender.id})
    response = client.post(post_url, data=data, content_type="application/json")
    return response


def get_swap_requests(client, sender):
    """
    Gets a list of swap requests for a given student.
    """
    client.force_login(sender.user)
    get_url = reverse("section-swap", args=[sender.section.id])
    body = {"student_id": sender.id}
    response = client.get(get_url, body, content_type="application/json")
    return response