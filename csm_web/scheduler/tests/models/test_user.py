import pytest

from django.db.utils import IntegrityError
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


@pytest.mark.django_db
def test_same_email():
    email = "test@berkeley.edu"
    username = "test"
    caps_email = "TEST@BERKELEY.EDU"
    caps_username = "TEST"
    user, created = User.objects.get_or_create(email=email, username=username)
    with pytest.raises(IntegrityError):
        caps_user, caps_created = User.objects.get_or_create(email=caps_email, username=caps_username)

    assert created
    assert user.email == email
    assert user.email != caps_email
    assert user.username == username
    assert user.username != caps_username
    assert User.objects.count() == 1
    assert User.objects.get(email=email).username == username
