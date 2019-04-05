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
from .serializers import (
    MatchingSerializer
)
from .permissions import (
    is_leader,
    IsLeader,
    IsLeaderOrReadOnly,
    IsReadIfOwner,
    IsOwner,
    DestroyIsOwner,
)

# Create your views here.

# Matching

@api_view(http_method_names=["POST"])
def update(request, pk):

    matching = get_object_or_404(Flag, pk=pk)

    dic = request.POST

    matching.user_id = dic["user_id"]
    matching.room_id = dic["room_id"]
    matching.start_datetime = dic["start_datetime"]
    matching.end_datetime = dic["end_datetime"]
    matching.weekly = dic["weekly"]

    matching.save()

    serialized_matching = MatchingSerializer(matching).data
    return Response(serialized_matching)

@api_view(http_method_names=["POST"])
def get_by_user(request):

    dic = request.POST

    serialized_matching = MatchingSerializer(Matching.objects.filter(user_id=dic["user_id"])).data
    return Response(serialized_matching)

@api_view(http_method_names=["POST"])
def get_by_room(request):
    
	dic = request.POST

	serialized_matching = MatchingSerializer(Matching.objects.filter(room_id=dic["room_id"])).data
    return Response(serialized_matching)

# REST Framework API Views

class CreateMatching(generics.CreateAPIView):

    queryset = Matching.objects.all().order_by("-date_joined")
    serializer_class = MatchingSerializer

    def create(self, request, *args, **kwargs):
	    return Response(status=204)

class DeleteMatching(generics.DestroyAPIView):

	permission_classes = (DestroyIsOwner,)

    def destroy(self, request, *args, **kwargs):
        matching = get_object_or_404(Matching, pk=self.kwargs["pk"])
        self.check_object_permissions(request, matching)
        if not matching.active:
            raise PermissionDenied(
                "This matching ({}) has been deactivated".format(matching)
            )
        matching.active = False
        matching.save()

        return Response({}, status=status.HTTP_204_NO_CONTENT)

