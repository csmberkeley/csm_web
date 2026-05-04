from django.db.models.query import EmptyQuerySet
from rest_framework.response import Response

from ..serializers import ProfileSerializer
from .utils import viewset_with


class ProfileViewSet(*viewset_with("list")):
    serializer_class = None
    queryset = EmptyQuerySet

    def list(self, request):
        """
        Lists out the profiles created by students, waitlisted students,
        mentors, and coords.
        """
        return Response(
            ProfileSerializer(
                [
                    *request.user.student_set.filter(active=True, banned=False),
                    *request.user.waitlistedstudent_set.filter(active=True),
                    *request.user.mentor_set.all(),  # .exclude(section=None),
                    *request.user.coordinator_set.all(),
                ],
                many=True,
            ).data
        )
