import pytest

from django.core.exceptions import ValidationError
from scheduler.models import WaitlistedStudent, Student, User
from scheduler.factories import UserFactory, CourseFactory, SectionFactory, StudentFactory, MentorFactory

def 

@pytest.mark.django_db
@pytest.skip
def test_add_waitlist():
    pass