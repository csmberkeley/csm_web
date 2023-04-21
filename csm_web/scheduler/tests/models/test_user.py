import pytest

from scheduler.models import User


@pytest.mark.django_db
def test_create_user():
    # test a user with default information
    email = "test@berkeley.edu"
    username = "test"
    user, created = User.objects.get_or_create(email=email, username=username)
    assert created
    assert user.email == email
    assert user.username == username
    assert User.objects.count() == 1
    assert User.objects.get(email=email).username == username
    assert User.objects.get(email=email).bio == None

    # test a user with a comeplete profile
    email = "example@berkeley.edu"
    username = "example"
    bio = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Phasellus congue neque et massa hendrerit varius. Suspendisse feugiat est ipsum, sed tincidunt lacus feugiat quis. Vivamus dictum condimentum lorem eu volutpat. Interdum et malesuada fames ac ante ipsum primis in faucibus. Suspendisse pulvinar tortor at libero iaculis, sit amet fringilla purus bibendum. Praesent id magna vel metus suscipit volutpat. Cras tincidunt ante sed pretium pretium. Nullam pretium cursus sapien ut gravida. Aenean tristique iaculis ex, laoreet congue leo vestibulum vitae. Nam metus orci, tincidunt id risus id, luctus porttitor arcu. Suspendisse ut mattis quam. Proin congue metus quis lectus consectetur tempus. Nulla sit amet metus sed enim vestibulum elementum et a enim."
    pronouns = "___/____"
    pronounciation = "ex-am-ple"
    is_private = False
    example, created = User.objects.get_or_create(
        email=email, username=username, bio=bio, pronouns=pronouns, pronounciation=pronounciation, is_private=is_private)
    assert created
    assert example.email == email
    assert example.username == username
    assert User.objects.count() == 2
    assert example.username == username
    assert example.bio == bio
    assert example.pronouns == pronouns
    assert example.pronunciation == pronounciation
    assert not example.is_private

# TODO test getting a user
# TODO test updating a user's information
# TODO features: sanitizing input (frontend job?), any characters django can't handle, how long should each filed be
# TODO edge cases: can't think of any now
