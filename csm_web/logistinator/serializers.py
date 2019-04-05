from datetime import timedelta
from django.utils import timezone
from rest_framework import serializers
from .models import Matching
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
            "start datetime",
            "end datetime",
            "weekly",
        )
