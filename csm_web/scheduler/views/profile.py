from django.db.models.query import EmptyQuerySet
from rest_framework.response import Response
from rest_framework import status
from scheduler.serializers import ProfileSerializer

from .utils import viewset_with


class ProfileViewSet(*viewset_with("list")):
    serializer_class = None
    queryset = EmptyQuerySet

    def list(self, request):
        return Response(
            ProfileSerializer(
                [
                    *request.user.student_set.filter(active=True, banned=False),
                    *request.user.mentor_set.all(),  # .exclude(section=None),
                    *request.user.coordinator_set.all(),
                ],
                many=True,
            ).data,
            status=status.HTTP_200_OK
        )
