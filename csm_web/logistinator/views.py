from django.shortcuts import render
from rest_framework import viewsets
from .models import Availability
from .serializers import AvailabilitySerializer

# Stubbed Availabiity Model
class AvailabilityViewSet(viewsets.ModelViewSet):
    queryset = Availability.objects.all()
    serializer_class = AvailabilitySerializer
