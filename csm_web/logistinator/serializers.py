from rest_framework import serializers
from .models import Matching, Availability
from .permissions import is_leader
from itertools import groupby
from datetime import datetime


class MatchingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Matching
        fields = (
            "id",
            "user_id",
            "room_id",
            "start_datetime",
            "end_datetime",
            "weekly",
        )


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ("user", "bitstring", "_bitstring_view")
