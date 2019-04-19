from django.shortcuts import render
from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import logout as auth_logout

from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Matching
from .serializers import MatchingSerializer

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
