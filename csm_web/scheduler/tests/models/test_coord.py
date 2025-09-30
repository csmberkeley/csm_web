import datetime

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from scheduler.factories import (
    CourseFactory,
    MentorFactory,
    SectionFactory,
    SpacetimeFactory,
    UserFactory,
)
from scheduler.models import Attendance, SectionOccurrence, Student

DEFAULT_TZ = timezone.get_default_timezone()

@pytest.mark.django_db(name="setup_section")
def test_what():  # pylint: disable=unused-argument
    """
    Set up a mentor, student, and section for attendance testing
    """
    print("hello")
    user = User.objects.create(email="test@berkeley.edu", username="test")
    course = CourseFactory.create(name="course", title="title")
    mentor = Mentor.objects.create(course=course, user=user)
#reverse
    print("here")
    print(APIClient().get('/api/coord/1/students'))

