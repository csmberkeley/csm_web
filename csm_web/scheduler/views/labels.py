import csv
from itertools import groupby

from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view

from ..models import Label
from ..serializers import LabelSerializer


@api_view(['PUT', 'POST'])
def label(request, label_id):
    """
    PATCH: Update label details
        - format: { "name": string, "description": string, showPopup: boolean }
    POST: Create new label details
        - format: {"name": string, "description": string, showPopup: boolean}
    """
    if request.method == "PUT":
        # initialize(?) new label
        label = Label.objects.get(id=label_id)
        # parsing the request data
        name = request.data.get("name")
        description = request.data.get("description")
        showPopup = request.data.get("showPopup")
        section_set = req

        # validation before adding
        if name is not None:
            label.name = name
        if description is not None:
            label.description = description
        if showPopup is not None:
            label.showPopup = showPopup

        # finalize (save and respond)
        label.save()
        serializer = LabelSerializer(label, many=None)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# PUT/POST /api/labels/<label_id>
