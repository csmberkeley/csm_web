from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view

from .utils import viewset_with
from ..models import Coordinator, User
from scheduler.serializers import UserSerializer


class UserViewSet(*viewset_with("list")):
    serializer_class = None
    queryset = User.objects.all()

    def list(self, request):
        if not (
            request.user.is_superuser
            or Coordinator.objects.filter(user=request.user).exists()
        ):
            raise PermissionDenied(
                "Only coordinators and superusers may view the user email list"
            )
        return Response(self.queryset.order_by("email").values_list("email", flat=True))


@api_view(["GET", "PUT"])
def userinfo(request):
    """
    Get user info for request user

    TODO: perhaps replace this with a viewset when we establish profiles
    """
    if request.method == "GET":
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    elif request.method == "PUT":
        user = User.objects.get(id=request.user)
        bio = request.data.get("bio")
        pronunciation = request.data.get("pronunciation")
        pronouns = request.data.get("pronouns")
        is_private = request.data.get("is_private")
        if bio is not None:
            user.bio = bio
        if pronunciation is not None:
            user.pronunciation = pronunciation
        if pronouns is not None:
            user.pronouns = pronouns
        if is_private is not None:
            user.is_private = is_private
        user.save()
        return Response(status=status.HTTP_201_CREATED)
