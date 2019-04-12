from rest_framework import serializers
from .models import Matching


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
