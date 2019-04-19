import datetime
from django.shortcuts import render
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

from .models import Matching, Availability
from .serializers import MatchingSerializer, AvailabilitySerializer

# Matching


@api_view(http_method_names=["POST"])
def update_matching(request, pk):

    matching = get_object_or_404(Matching, pk=pk)

    dic = request.POST

    matching.user_id = dic["user_id"]
    matching.room_id = dic["room_id"]
    matching.start_datetime = dic["start_datetime"]
    matching.end_datetime = dic["end_datetime"]
    matching.weekly = dic["weekly"]

    matching.save()

    serialized_matching = MatchingSerializer(matching).data
    return Response(serialized_matching)


# REST Framework API Views


class CreateMatching(generics.CreateAPIView):

    queryset = Matching.objects.all()
    serializer_class = MatchingSerializer


class MatchingUserList(generics.ListAPIView):

    serializer_class = MatchingSerializer

    def get_queryset(self):
        return Matching.objects.filter(active=True).filter(
            user_id=self.kwargs["user_id"]
        )


class MatchingRoomList(generics.ListAPIView):

    serializer_class = MatchingSerializer

    def get_queryset(self):
        return Matching.objects.filter(active=True).filter(
            room_id=self.kwargs["room_id"]
        )


class MatchingList(generics.ListAPIView):

    serializer_class = MatchingSerializer

    def get_queryset(self):
        return Matching.objects.all()


class DeleteMatching(generics.DestroyAPIView):
    def destroy(self, request, *args, **kwargs):
        matching = get_object_or_404(Matching, pk=self.kwargs["pk"])
        if not matching.active:
            raise PermissionDenied(
                "This matching ({}) has been deactivated".format(matching)
            )
        matching.active = False
        matching.save()

        return Response({}, status=status.HTTP_204_NO_CONTENT)


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
