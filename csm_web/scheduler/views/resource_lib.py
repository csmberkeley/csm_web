from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import (
    NotAuthenticated,
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response

from ..models import Coordinator, LibraryResource, Mentor, ResourceVersion
from ..serializers import LibraryResourceSerializer, ResourceVersionSerializer


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


def create_library_resource(request):
    """Create a pending library resource submission"""
    if not request.user.is_authenticated:
        raise NotAuthenticated("You must be logged in to submit a resource")

    required_fields = (
        "course",
        "resource_type",
    )

    missing_fields = [field for field in required_fields if field not in request.data]
    if missing_fields:
        raise ValidationError(
            {field: ["This field is required."] for field in missing_fields}
        )

    resource_data = {
        "course": request.data["course"],
        "category": request.data["category"],
        "tags": request.data.get("tags", []),
    }

    resource_serializer = LibraryResourceSerializer(
        data=resource_data,
        context={"request": request},
    )

    resource_serializer.is_valid(raise_exception=True)

    course = resource_serializer.validated_data["course"]
    category = resource_serializer.validated_data["category"]
    if category.course_id != course.id:
        raise ValidationError(
            {"category": ["The category must belong to the selected course."]}
        )
    is_mentor = Mentor.objects.filter(
        user=request.user,
        course=course,
    ).exists()

    is_coordinator = Coordinator.objects.filter(
        user=request.user,
        course=course,
    ).exists()

    if not (is_mentor or is_coordinator):
        raise PermissionDenied("You must be a mentor or coordinator for this course.")

    version_data = {
        "title": request.data["title"],
        "description": request.data["description"],
        "file_ref": request.data["file_ref"],
        "resource_type": request.data["resource_type"],
    }

    with transaction.atomic():
        resource = resource_serializer.save(
            uploader=request.user,
            archived_status=False,
        )
        version_data["resource"] = resource.pk
        version_serializer = ResourceVersionSerializer(data=version_data)
        version_serializer.is_valid(raise_exception=True)
        version = version_serializer.save(
            version_number=1,
            status=ResourceVersion.Status.PENDING,
            reviewer=None,
        )
    resource_output = LibraryResourceSerializer(
        resource,
        context={"request": request},
    ).data

    version_output = ResourceVersionSerializer(
        version,
        context={"request": request},
    ).data

    response_data = {
        "resource": resource_output,
        "version": version_output,
    }
    return Response(
        response_data,
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET", "POST"])
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
    if request.method == "POST":
        return create_library_resource(request)

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
