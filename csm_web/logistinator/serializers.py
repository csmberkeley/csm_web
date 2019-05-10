from rest_framework import serializers
from .models import Matching, Availability, RoomAvailability, Conflict

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

class ConflictSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conflict
        fields = ("id", "user_id", "room_id", "start_datetime", "end_datetime")


class RoomAvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomAvailability
        fields = ("id", "availability_bitstring")

