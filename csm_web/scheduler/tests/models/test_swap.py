import pytest
import json 

from django.urls import reverse
from django.core.exceptions import ValidationError
from rest_framework.exceptions import NotFound
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
    section_one_students, section_two_students = setup_scheduler[3:]
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
    section_one_students, section_two_students = setup_scheduler[3:]
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
    section_one_students, section_two_students = setup_scheduler[3:] 
    sender, receiver = section_one_students[0], section_two_students[0]
    receiver_email = email
    if (type(receiver_email) != str):
        receiver_email = receiver.user.email
    receiver.user.email = receiver_email
    response = create_swap_request(client, sender, receiver)
    if type(email) == str:
        assert response.status_code == 404
    else:
        assert response.status_code == 201
        # Check that the swap request was created
        assert Swap.objects.filter(receiver=receiver).exists()


@pytest.mark.django_db
def test_accept_swap_request(client, setup_scheduler):
    """
    Tests that a student can accept a swap request.
    """
    section_one_students, section_two_students = setup_scheduler[3:]
    sender, receiver = section_one_students[0], section_two_students[0]
    create_swap_request(client, sender, receiver)
    # Get the swap_id
    swap_id = json.loads(get_swap_requests(client, sender).content.decode("utf-8"))["sender"][0]["id"]
    accept_swap_request(client, receiver, swap_id)
    # Record old section ids
    old_sender_section_id, old_receiver_section_id = sender.section.id, receiver.section.id
    # Get the new section ids
    sender.refresh_from_db()
    receiver.refresh_from_db()
    # Make sure that the swap was accepted
    assert sender.section.id == old_receiver_section_id
    assert receiver.section.id == old_sender_section_id
    # Make sure that all swaps for both students are cleared
    assert len(json.loads(get_swap_requests(client, sender).content.decode("utf-8"))["sender"]) == 0
    assert len(json.loads(get_swap_requests(client, receiver).content.decode("utf-8"))["sender"]) == 0


@pytest.mark.django_db
def test_reject_swap_request(client, setup_scheduler):
    """
    Tests that a student can reject a swap request.
    """
    section_one_students, section_two_students = setup_scheduler[3:]
    sender, receiver = section_one_students[0], section_two_students[0]
    create_swap_request(client, sender, receiver)
    # Get the swap_id
    swap_id = json.loads(get_swap_requests(client, sender).content.decode("utf-8"))["sender"][0]["id"]
    reject_swap_request(client, receiver, swap_id)
    # Make sure that the swap was rejected
    assert len(json.loads(get_swap_requests(client, receiver).content.decode("utf-8"))["sender"]) == 0


@pytest.mark.django_db
def test_swap_conflict_clear(client, setup_scheduler):
    """
    Test for when a student has multiple swap requests pending and one of them
    is accepted. In this case, all other swap requests from that user should be
    invalidated and cleared.
    """
    section_one_students, section_two_students = setup_scheduler[3:]
    sender = section_one_students[0]
    receiver_one, receiver_two = section_two_students[0], section_two_students[1]
    create_swap_request(client, sender, receiver_one)
    create_swap_request(client, sender, receiver_two)
    # Get first swap_id
    swap_id_one = json.loads(get_swap_requests(client, sender).content.decode("utf-8"))["sender"][0]["id"]
    # Accept first swap request
    accept_swap_request(client, receiver_one, swap_id_one)
    # Make sure that the second swap request was cleared
    assert len(json.loads(get_swap_requests(client, receiver_two).content.decode("utf-8"))["receiver"]) == 0

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
    post_url = reverse("section-swap-no-id", args=[sender.section.id]) 
    data = json.dumps({"receiver_email": reciever.user.email, "student_id": sender.id})
    response = client.post(post_url, data=data, content_type="application/json")
    return response


def get_swap_requests(client, sender):
    """
    Gets a list of swap requests for a given student.
    """
    client.force_login(sender.user)
    get_url = reverse("section-swap-no-id", args=[sender.section.id])
    body = {"student_id": sender.id}
    response = client.get(get_url, body, content_type="application/json")
    return response


def accept_swap_request(client, receiver, swap_id):
    """
    Accepts a swap request between two students.
    """
    client.force_login(receiver.user)
    post_url = reverse("section-swap-with-id", kwargs={"section_id": receiver.section.id, "swap_id": swap_id})
    data = json.dumps({"student_id": receiver.id})
    response = client.post(post_url, data, content_type="application/json")
    return response


def reject_swap_request(client, receiver, swap_id):
    """
    Receiver rejects a swap request from a sender.
    """
    client.force_login(receiver.user)
    delete_url = reverse("section-swap-with-id", kwargs={"section_id": receiver.section.id, "swap_id": swap_id})
    response = client.delete(delete_url)
    return response