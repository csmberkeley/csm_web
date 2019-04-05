from rest_framework import serializers
from .models import Matching, Availability, Conflict
from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import Matching, Availability
from datetime import timedelta
from django.utils import timezone
from .permissions import is_leader
from itertools import groupby
from datetime import datetime
from .models import Matching, 


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

