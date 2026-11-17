from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotAuthenticated, PermissionDenied, ValidationError
from rest_framework.response import Response

from ..models import LibraryResource, ResourceCategory
from ..serializers import ResourceCategorySerializer
from .resource_lib import _get_course_roles
from .utils import viewset_with


def _require_coordinator(user, course):
    if not user.is_authenticated:
        raise NotAuthenticated("You must be logged in to manage categories")
    _, is_coordinator = _get_course_roles(user, course)
    if not is_coordinator:
        raise PermissionDenied("You must be a coordinator of this course")


def _as_drf_error(error):
    """Convert a model-level (Django) validation error into a 400 response."""
    detail = error.message_dict if hasattr(error, "error_dict") else error.messages
    return ValidationError(detail)


class ResourceCategoryViewSet(
    *viewset_with("list", "create", "update", "partial_update", "destroy")
):
    """
    Endpoint: /api/library/categories/

    list: any user; requires a ``course`` query param (course id)
    create / update / destroy: coordinators of the category's course only

    destroy accepts an optional ``reassign_to`` query param (category id in
    the same course). Resources in the deleted category move to that category;
    without it they become uncategorized.
    """

    serializer_class = ResourceCategorySerializer
    queryset = ResourceCategory.objects.select_related("course")

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action != "list":
            return queryset

        course_id = self.request.query_params.get("course")
        if course_id is None or not course_id.isdigit():
            raise ValidationError({"course": ["A 'course' id query param is required."]})
        return queryset.filter(course_id=course_id, course__is_restricted=False)

    def perform_create(self, serializer):
        _require_coordinator(self.request.user, serializer.validated_data["course"])
        try:
            serializer.save(created_by=self.request.user, created_at=timezone.now())
        except DjangoValidationError as error:
            raise _as_drf_error(error) from error

    def perform_update(self, serializer):
        _require_coordinator(self.request.user, serializer.instance.course)
        try:
            serializer.save()
        except DjangoValidationError as error:
            raise _as_drf_error(error) from error

    def destroy(self, request, *args, **kwargs):
        category = self.get_object()
        _require_coordinator(request.user, category.course)

        reassign_id = request.query_params.get("reassign_to")
        target = None
        if reassign_id is not None:
            target = (
                ResourceCategory.objects.filter(pk=reassign_id).first()
                if reassign_id.isdigit()
                else None
            )
            if target is None or target.course_id != category.course_id:
                raise ValidationError(
                    {"reassign_to": ["Must be another category in the same course."]}
                )
            if target.pk == category.pk:
                raise ValidationError(
                    {"reassign_to": ["Cannot reassign to the category being deleted."]}
                )

        with transaction.atomic():
            moved = LibraryResource.objects.filter(category=category).update(
                category=target
            )
            category.delete()

        key = "reassigned" if target is not None else "uncategorized"
        return Response({key: moved}, status=status.HTTP_200_OK)
