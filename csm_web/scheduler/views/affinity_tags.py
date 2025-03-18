from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from scheduler.serializers import AffinityTagSerializer

from ..models import AffinitySectionTag


@api_view(["GET"])
def get_tags(request):
    """
    Get all affinity tags
    """
    tags = AffinitySectionTag.objects.all()
    serializer = AffinityTagSerializer(tags, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
