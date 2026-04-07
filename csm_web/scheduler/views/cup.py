from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework.decorators import api_view
from rest_framework.response import Response
from scheduler.serializers import LeaderboardSerializer

from ..models import Family


@api_view(["GET"])
def view_leaderboard(request):
    """
    Endpoint: /cup/leaderboard/

    GET: view all families' course, mentors, points
    """

    families = (
        Family.objects.annotate(total_point=Coalesce(Sum("points__num_points"), 0))
        .prefetch_related("mentor_set")
        .order_by("-total_points")
    )

    return Response(LeaderboardSerializer(families).data)
