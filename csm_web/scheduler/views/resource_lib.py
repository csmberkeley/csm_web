from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import (
    NotAuthenticated,
    NotFound,
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


VERSION_FIELDS = ("title", "description", "file_ref", "resource_type")
RESOURCE_FIELDS = ("category", "tags")


def _get_course_roles(user, course):
    """Return (is_mentor, is_coordinator) for the user in the given course."""
    is_mentor = Mentor.objects.filter(user=user, course=course).exists()
    is_coordinator = Coordinator.objects.filter(user=user, course=course).exists()
    return is_mentor, is_coordinator


@api_view(["PUT", "PATCH"])
def config_resource(request, pk):
    """
    Endpoint: /api/library/resources/<pk>/
    Edit a library resource.

    - Mentors may edit only resources they uploaded; coordinators may edit any
      resource in their course.
    - Changes to title/description/file_ref/resource_type never modify an
      approved version. If the latest version is pending, it is updated in
      place; otherwise (approved or rejected) a new pending version is created.
      The currently published version stays live until the new one is
      approved, so pending content is never exposed.
    - category/tags are resource-level metadata and apply immediately.
    - Only coordinators may change archived_status (archive/unarchive).
    """
    if not request.user.is_authenticated:
        raise NotAuthenticated("You must be logged in to edit a resource")

    unknown_fields = set(request.data) - set(
        VERSION_FIELDS + RESOURCE_FIELDS + ("archived_status",)
    )
    if unknown_fields:
        raise ValidationError(
            {field: ["This field cannot be edited."] for field in unknown_fields}
        )

    with transaction.atomic():
        try:
            resource = (
                LibraryResource.objects.select_for_update()
                .select_related("course")
                .get(pk=pk)
            )
        except LibraryResource.DoesNotExist:
            return Response(
                {"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND
            )

        is_mentor, is_coordinator = _get_course_roles(request.user, resource.course)
        is_owner = resource.uploader_id == request.user.id
        if not (is_coordinator or (is_mentor and is_owner)):
            raise PermissionDenied(
                "You can only edit your own submissions, unless you are a coordinator."
            )

        if "archived_status" in request.data and not is_coordinator:
            raise PermissionDenied("Only coordinators can archive resources.")
        if resource.archived_status and not is_coordinator:
            raise PermissionDenied("Archived resources cannot be edited.")

        # resource-level metadata
        resource_data = {
            field: request.data[field]
            for field in RESOURCE_FIELDS + ("archived_status",)
            if field in request.data
        }
        if resource_data:
            resource_serializer = LibraryResourceSerializer(
                resource,
                data=resource_data,
                partial=True,
                context={"request": request},
            )
            resource_serializer.is_valid(raise_exception=True)
            category = resource_serializer.validated_data.get(
                "category", resource.category
            )
            if category is not None and category.course_id != resource.course_id:
                raise ValidationError(
                    {"category": ["The category must belong to the selected course."]}
                )
            resource = resource_serializer.save()

        # version content
        version = None
        version_changes = {
            field: request.data[field]
            for field in VERSION_FIELDS
            if field in request.data
        }
        if version_changes:
            latest = (
                ResourceVersion.objects.filter(resource=resource)
                .order_by("-version_number")
                .first()
            )
            if latest is not None and latest.status == ResourceVersion.Status.PENDING:
                # still awaiting review; revise the pending submission in place
                version_serializer = ResourceVersionSerializer(
                    latest, data=version_changes, partial=True
                )
                version_serializer.is_valid(raise_exception=True)
                version = version_serializer.save()
            else:
                # approved or rejected: submit a new version for (re)approval
                version_data = {
                    field: getattr(latest, field) if latest is not None else ""
                    for field in VERSION_FIELDS
                }
                version_data.update(version_changes)
                version_data["resource"] = resource.pk
                version_serializer = ResourceVersionSerializer(data=version_data)
                version_serializer.is_valid(raise_exception=True)
                version = version_serializer.save(
                    version_number=(latest.version_number + 1) if latest else 1,
                    status=ResourceVersion.Status.PENDING,
                    reviewer=None,
                    feedback="",
                )

    response_data = {
        "resource": LibraryResourceSerializer(
            resource, context={"request": request}
        ).data,
        "version": (
            ResourceVersionSerializer(version, context={"request": request}).data
            if version is not None
            else None
        ),
    }
    return Response(response_data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
def delete_resource(request, pk):
    """
    Endpoint: /api/library/resources/<pk>/
    Coordinators only. Archives the resource by default (hidden from the public
    library, but kept with its version history). Pass ?hard=true to delete the
    resource and all of its versions permanently.
    """
    if not request.user.is_authenticated:
        raise NotAuthenticated("You must be logged in to remove a resource")

    try:
        resource = LibraryResource.objects.select_related("course").get(pk=pk)
    except LibraryResource.DoesNotExist:
        return Response(
            {"error": "Resource not found"}, status=status.HTTP_404_NOT_FOUND
        )

    _, is_coordinator = _get_course_roles(request.user, resource.course)
    if not is_coordinator:
        raise PermissionDenied("Only coordinators can remove resources.")

    if request.query_params.get("hard", "").lower() in ("true", "1"):
        resource.delete()
    else:
        resource.archived_status = True
        resource.save(update_fields=["archived_status", "updated_at"])

    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
def pending(request):
    """
    Endpoint: /api/library/resources/pending/
    Returns the pending versions for every course the user coordinates,
    oldest first. Users who coordinate no courses get an empty list.
    """
    if not request.user.is_authenticated:
        raise NotAuthenticated("You must be logged in to view the review queue")

    course_ids = Coordinator.objects.filter(user=request.user).values_list(
        "course_id", flat=True
    )
    versions = ResourceVersion.objects.filter(
        status=ResourceVersion.Status.PENDING,
        resource__course_id__in=course_ids,
        resource__archived_status=False,
    ).select_related("resource")

    return Response(ResourceVersionSerializer(versions, many=True).data)


def _review_version(request, pk, new_status):
    """
    Shared by approve and reject.
    404 if the version doesn't exist, 403 unless the user coordinates its
    course, 400 if it isn't pending. Approving also publishes the version;
    rejecting leaves the published version alone.
    """
    if not request.user.is_authenticated:
        raise NotAuthenticated("You must be logged in to review resources")

    with transaction.atomic():
        try:
            version = ResourceVersion.objects.get(pk=pk)
        except ResourceVersion.DoesNotExist as error:
            raise NotFound("Version not found") from error

        resource = LibraryResource.objects.select_for_update().get(
            pk=version.resource_id
        )
        version.refresh_from_db()

        reviewer = Coordinator.objects.filter(
            user=request.user, course_id=resource.course_id
        ).first()
        if reviewer is None:
            raise PermissionDenied(
                "You must be a coordinator of this course to review resources."
            )
        if version.status != ResourceVersion.Status.PENDING:
            raise ValidationError("Only pending versions can be reviewed.")

        version.status = new_status
        version.reviewer = reviewer
        version.reviewed_at = timezone.now()
        version.feedback = request.data.get("feedback", "")
        version.save()

        if new_status == ResourceVersion.Status.APPROVED:
            resource.published_version_ref = version
            resource.save()

    return Response(ResourceVersionSerializer(version).data)


@api_view(["POST"])
def approve(request, pk):
    """
    Endpoint: /api/library/versions/<pk>/approve/
    Approves a pending version and makes it the published version.
    """
    return _review_version(request, pk, ResourceVersion.Status.APPROVED)


@api_view(["POST"])
def reject(request, pk):
    """
    Endpoint: /api/library/versions/<pk>/reject/
    Body (optional): {"feedback": "..."}
    Rejects a pending version. The currently published version stays public.
    """
    return _review_version(request, pk, ResourceVersion.Status.REJECTED)
