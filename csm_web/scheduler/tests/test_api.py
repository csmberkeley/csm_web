from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from scheduler.models import Profile
from .utils import gen_test_data


class TestAPISanity(TestCase):
    @classmethod
    def setUpTestData(cls):
        utils.gen_test_data(cls, 300)
