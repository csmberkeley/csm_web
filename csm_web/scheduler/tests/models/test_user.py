import pytest

from scheduler.models import User


@pytest.mark.django_db
def test_create_user():
    email = "test@berkeley.edu"
    username = "test"
    user, created = User.objects.get_or_create(email=email, username=username)
    assert created
    assert user.email == email
    assert user.username == username
    assert User.objects.count() == 1
    assert User.objects.get(email=email).username == username
