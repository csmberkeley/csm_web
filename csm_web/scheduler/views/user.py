from django.core.exceptions import MultipleObjectsReturned, ObjectDoesNotExist
from rest_framework import status
from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import UserSerializer

from ..models import Coordinator, User
from .utils import get_object_or_error, log_str, logger, viewset_with


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

    @action(detail=True, methods=["PUT"])
    def email(self, request, pk=None):
        user = get_object_or_error(self.queryset, pk=pk)
        user.subscribed = not user.subscribed
        user.save()
        return Response(status=status.HTTP_200_OK)


@api_view(["GET"])
def userinfo(request):
    """
    Get user info for request user

    TODO: perhaps replace this with a viewset when we establish profiles
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)
