from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view

from .utils import viewset_with
from ..models import Swap, Student
from scheduler.serializers import UserSerializer


