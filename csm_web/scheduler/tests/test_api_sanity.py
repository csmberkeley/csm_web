from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from .utils import *

class TestAPISanity(TestCase):

	@classmethod
	def setUpTestData(cls):
		cls.users = make_test_users(10)

	def test_help(self):
		print("in help")