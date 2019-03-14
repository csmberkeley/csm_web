from django.shortcuts import render

# Create your views here.

from django.http import Http404
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from django.core import serializers
from django.conf import settings
import json


@api_view()
def say_hello(request):
    return Response({"message": "Hello, world!"})
