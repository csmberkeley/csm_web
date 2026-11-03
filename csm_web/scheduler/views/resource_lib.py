from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from ..models import LibraryResource, ResourceVersion


def serialize_library_resource(resource):
    """
    Serialize a library resource with the metadata needed for frontend resource cards.
    Assumes the resource has an approved published version.
    """
    version = resource.published_version_ref
    uploader = resource.uploader
    category = resource.category
    return {
        "id": resource.id,
        "title": version.title,
        "description": version.description,
        "resource_type": version.resource_type,
        "file_ref": version.file_ref,
        "version_number": version.version_number,
        "tags": resource.tags,
        "course": {
            "id": resource.course.id,
            "name": resource.course.name,
            "title": resource.course.title,
        },
        "category": (
            {"id": category.id, "name": category.name} if category is not None else None
        ),
        "uploader": (
            {
                "id": uploader.id,
                "first_name": uploader.first_name,
                "last_name": uploader.last_name,
            }
            if uploader is not None
            else None
        ),
    }


@api_view(["GET"])
def library_resources(request):
    """
    Endpoint: /api/resources
    Returns all approved, published, non-archived library resources.

    query params (optional):
    course - course id to filter by
    category - resource category id to filter by
    type - resource type to filter by (e.g. "pdf", "file")
    search - case-insensitive substring match on the resource title
    """
    resources = LibraryResource.objects.filter(
        archived_status=False,
        published_version_ref__isnull=False,
        published_version_ref__status=ResourceVersion.Status.APPROVED,
        course__is_restricted=False,
    ).select_related("published_version_ref", "course", "category", "uploader")

    course_id = request.query_params.get("course")
    category_id = request.query_params.get("category")
    resource_type = request.query_params.get("type")
    search = request.query_params.get("search")

    for name, value in (("course", course_id), ("category", category_id)):
        if value is not None and not value.isdigit():
            return Response(
                {"error": f"'{name}' must be an integer id"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    if (
        resource_type is not None
        and resource_type not in ResourceVersion.ResourceType.values
    ):
        return Response(
            {"error": f"'type' must be one of {ResourceVersion.ResourceType.values}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if course_id is not None:
        resources = resources.filter(course_id=course_id)
    if category_id is not None:
        resources = resources.filter(category_id=category_id)
    if resource_type is not None:
        resources = resources.filter(published_version_ref__resource_type=resource_type)
    if search:
        resources = resources.filter(
            published_version_ref__title__icontains=search.strip()
        )

    return Response([serialize_library_resource(resource) for resource in resources])
