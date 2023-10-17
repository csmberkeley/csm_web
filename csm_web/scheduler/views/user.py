from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from django_ratelimit.decorators import ratelimit


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


@api_view(["GET"])
def userinfo(request):
    """
    Get user info for request user

    TODO: perhaps replace this with a viewset when we establish profiles
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "PUT"])
def profile(request, pk=None):
    """
    Function for handling user profile things 
    GET: Gets the information associated with the user profile.
    PUT: Edit the profile of a user specified by the user id. ANY coordinator for ANY course can edit ANY profile.
    Request: {'user_id': int}
    Response: status code
    """
    queryset = User.objects.all()
    coordinators = Coordinator.objects.all()

    if request.method == "GET":
        serializer = UserSerializer(queryset.get(pk=pk))
        return Response(serializer.data, status=status.HTTP_200_OK)

    if not (
        request.user.is_superuser
        or (queryset.filter(pk=pk).exists() and queryset.get(pk=pk) == request.user)
        or coordinators.filter(user=request.user).exists()
    ):
        raise PermissionDenied("You're not allowed to edit that user's profile.")
    else:
        data = {}
        data["bio"] = request.data["bio"]


@api_view(["GET", "PUT"])
def upload_image(request, pk=None):
    pass
