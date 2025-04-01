from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from scheduler.serializers import AffinityTagSerializer

from ..models import AffinitySectionTag


@api_view(["GET", "POST", "PUT", "DELETE"])
def configure_tags(request, pk=None):
    """
    Manages affinity tags.

    - GET /api/affinity_tags/           ... Retrieve all tags.
    - GET /api/affinity_tags/<pk>/      ... Retrieve a specific tag.
    - POST /api/affinity_tags/          ... Create a new tag (Coordinators only).
    - PUT /api/affinity_tags/<pk>/      ... Update an existing tag (Coordinators only).
    - DELETE /api/affinity_tags/<pk>/   ... Delete an existing tag (Coordinators only).
    """
    if request.method == "GET":
        return get_tag(request, pk) if pk else get_tags(request)

    if request.method == "POST":
        return add_tag(request)

    if not pk:
        return Response(
            {"error": "Tag ID is required for this operation."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if request.method == "PUT":
        return update_tag(request, pk)

    if request.method == "DELETE":
        return delete_tag(request, pk)

    return Response(
        {"error": "Request method not supported."},
        status=status.HTTP_405_METHOD_NOT_ALLOWED,
    )


def get_tags(request):
    """Retrieves all affinity tags."""
    tags = AffinitySectionTag.objects.all()
    serializer = AffinityTagSerializer(tags, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


def get_tag(request, pk):
    """Retrieves a single affinity tag."""
    tag = get_object_or_404(AffinitySectionTag, pk=pk)
    serializer = AffinityTagSerializer(tag)
    return Response(serializer.data, status=status.HTTP_200_OK)


def add_tag(request):
    """Creates a new affinity tag."""
    serializer = AffinityTagSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def update_tag(request, pk):
    """Updates an affinity tag."""
    tag = get_object_or_404(AffinitySectionTag, pk=pk)
    serializer = AffinityTagSerializer(tag, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


def delete_tag(request, pk):
    """Deletes an affinity tag."""
    tag = get_object_or_404(AffinitySectionTag, pk=pk)
    tag.delete()
    return Response(
        {"message": "Tag deleted successfully"}, status=status.HTTP_204_NO_CONTENT
    )
