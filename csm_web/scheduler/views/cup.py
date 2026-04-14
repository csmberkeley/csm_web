from django.db.models import Sum
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from scheduler.serializers import ChallengeSerializer, LeaderboardSerializer

from ..models import Challenge, Family


@api_view(["GET"])
def view_leaderboard(request):
    """
    Endpoint: /cup/leaderboard/

    GET: view all families' course, mentors, points
    """

    families = (
        Family.objects.annotate(totalPoints=Coalesce(Sum("points__num_points"), 0))
        .prefetch_related("mentor_set")
        .order_by("-totalPoints")
    )

    return Response(LeaderboardSerializer(families, many=True).data)


# Get/post challenges
# post points
# Post family (coords make/assign family w/ 2 diff apis) do in coords file


@api_view(["GET", "POST"])
def challenge_list_create(request):
    """
    Endpoint: /cup/challenges/

    GET: View a list of all challenges.
    POST: Create a new challenge.
    """

    if request.method == "GET":
        challenges = Challenge.objects.all().order_by("-start_date")
        serializer = ChallengeSerializer(challenges, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        serializer = ChallengeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
