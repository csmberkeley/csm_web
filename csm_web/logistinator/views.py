from rest_framework import viewsets
from .models import Availability, ImposedEvent
from .serializers import AvailabilitySerializer, ImposedEventSerializer

from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import logout as auth_logout

from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

import datetime

# Stubbed Availabiity Model
class AvailabilityViewSet(viewsets.ModelViewSet):
    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer


@api_view(http_method_names=["GET"])
def get_full_availability(request, pk):
    availability = get_object_or_404(Availability, pk=pk)
    serialized_availability = AvailabilitySerializer(availability).data
    return Response(serialized_availability)


@api_view(http_method_names=["GET"])
def get_availability(request, pk):
    availability = get_object_or_404(Availability, pk=pk)
    params = request.POST
    start_time = datetime.datetime.strptime(params["start_time"], "%H:%M").time()
    end_time = datetime.datetime.strptime(params["end_time"], "%H:%M").time()
    interval = datetime.timedelta(minutes=int(params["interval"]))

    availability_dictionary = availability.get_weekly_availability(
        start_time, end_time, interval
    )
    return Response(availability_dictionary)


@api_view(http_method_names=["POST"])
def set_availability(request, pk):
    availability = get_object_or_404(Availability, pk=pk)
    params = request.POST
    start_time = datetime.datetime.strptime(params["start_time"], "%H:%M").time()
    end_time = datetime.datetime.strptime(params["end_time"], "%H:%M").time()
    day = int(params["day"])
    is_available = int(params["is_available"])

    availability._set_availability(day, start_time, end_time, is_available)
    availability.save()

    serialized_availability = AvailabilitySerializer(availability).data
    return Response(serialized_availability)
