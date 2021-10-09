import pytest
from scheduler.models import User


@pytest.mark.django_db
def test_user_create():
    mentor_email = "JohnnyAppleseed@berkeley.edu"
    User.objects.get_or_create(email=mentor_email, username=mentor_email.split('@')[0])
    assert User.objects.count() == 1


@pytest.fixture
def create_users(db, django_user_model):
    i = 0

    def make_users(number_of_users):
        users = []
        for j in range(number_of_users):
            user_email = "user_" + str(i).rjust(3, "0")
            user, _ = User.objects.get_or_create(email=user_email, username=user_email.split('@')[0])
            users.append(user)
            i = i + 1
        return users
    return make_users

# TODO: add student to section -> new SO/attendance creates

# TODO: student drop -> extra attendance/SO deleted
