import csv
from itertools import groupby

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q, Count, Prefetch
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from .utils import get_object_or_error, viewset_with
from ..models import Course, Student, Spacetime, Section
from ..serializers import CourseSerializer, SectionSerializer, LabelSerializer


@api_view(['POST', 'PUT'])
def label(request):
    """
    POST: Update section details
        - format: { "name": string, "description": string, showPopup: boolean }
    """
    if request.method == "POST":
        # initialize(?) new label
        newLabel = _____

        # parsing the request data
        name = request.data.get("name")
        description = request.data.get("description")
        showPopup = request.data.get("showPopup")

        # validation before adding
        if name is not None:
            newLabel.name = name
        if description is not None:
            newLabel.description = description
        if showPopup is not None:
            newLabel.showPopup = showPopup

        # finalize (save and respond)
        newLabel.save()
        return Response(status=status.HTTP_201_CREATED)
