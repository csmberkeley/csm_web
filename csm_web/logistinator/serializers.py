from rest_framework import serializers
from .models import Availability


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ("user", "bitstring", "_bitstring_view")
