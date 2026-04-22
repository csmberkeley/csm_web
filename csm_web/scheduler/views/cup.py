from django.db import transaction
from django.db.models import F, Sum
from django.db.models.functions import Coalesce
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from scheduler.serializers import (
    AddPointsSerializer,
    ChallengeSerializer,
    FamilyChallengeSerializer,
    LeaderboardSerializer,
)

from ..models import Challenge, Family, Points

# from .utils import log_str


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


@api_view(["GET", "POST"])
def view_and_create_challenges(request):
    """
    Endpoint: /cup/challenges/

    GET: view all challenges (admin and non-admin users can see this)
    POST: create a new challenge (admin only)
    """
    if request.method == "GET":
        challenges = Challenge.objects.all().order_by("-start_date")
        # Uses the base serializer (no null points)
        serializer = ChallengeSerializer(challenges, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        # Note: Your frontend POST body must send "maxPoints": 50, NOT "points": 50
        serializer = ChallengeSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    return Response(
        {"error": "Method not allowed"}, status=status.HTTP_405_METHOD_NOT_ALLOWED
    )


@api_view(["GET"])
def view_family_challenges(request, family_id):
    """
    Endpoint: /cup/<family_id>/challenges/

    GET: view all challenges and the specific family's points for each challenge
    """

    try:
        family = Family.objects.get(id=family_id)
    except Family.DoesNotExist:
        return Response({"error": "Family not found"}, status=status.HTTP_404_NOT_FOUND)

    challenges = Challenge.objects.filter(points__family_id=family).annotate(
        family_points=F("points__num_points")
    )

    # Uses the specialized Family serializer!
    serializer = FamilyChallengeSerializer(challenges, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def post_points(request):
    """
    Endpoint: /cup/add_points/
    POST: Add new points to a family for a specific challenge.
    """
    serializer = AddPointsSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        for family in serializer.validated_data["family_ids"]:
            Points.objects.update_or_create(
                challenge_id=serializer.validated_data["challenge"],
                family_id=family,
                defaults={"num_points": serializer.validated_data["points"]},
            )

    return Response({"status": "success"}, status=status.HTTP_200_OK)
