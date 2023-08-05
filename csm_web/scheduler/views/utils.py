import logging
from operator import attrgetter
from typing import Any, Generic, Iterator, TypeVar

from django.core.exceptions import ObjectDoesNotExist, PermissionDenied
from django.db import models
from django.db.models.query import QuerySet
from django.shortcuts import get_object_or_404
from rest_framework import mixins, viewsets
from scheduler.models import (
    Attendance,
    DayOfWeekField,
    Override,
    Section,
    Spacetime,
    User,
)

logger = logging.getLogger(__name__)
logger.info = logger.warning


def log_str(obj) -> str:
    def log_format(*args) -> str:
        return (
            "<"
            + ";".join(
                f"{attr}={val() if callable(val := attrgetter(attr)(obj)) else val}"
                for attr in args
            )
            + ">"
        )

    try:
        if isinstance(obj, User):
            return log_format("pk", "email")
        if isinstance(obj, Section):
            return log_format("pk", "mentor.course.name", "spacetimes.all")
        if isinstance(obj, Spacetime):
            return log_format(
                "pk", "section.mentor.course.name", "location", "start_time"
            )
        if isinstance(obj, Override):
            return log_format("pk", "date", "spacetime.pk")
        if isinstance(obj, Attendance):
            return log_format("pk", "sectionOccurrence.date", "presence")
    except Exception as error:
        logger.error("<Logging> Exception while logging: %s", error)
    return ""


def get_object_or_error(specific_queryset, **kwargs):
    """
    Look up an object by kwargs in specific_queryset. If it exists there,
    return it. If the object exists but is not within the scope of the specific_queryset,
    raise a permission error (403), otherwise if the object does not exist at all raise a 404.
    """
    try:
        return specific_queryset.get(**kwargs)
    except ObjectDoesNotExist:
        if get_object_or_404(specific_queryset.model.objects, **kwargs):
            raise PermissionDenied()
        raise ObjectDoesNotExist()


METHOD_MIXINS = {
    "list": mixins.ListModelMixin,
    "create": mixins.CreateModelMixin,
    "retrieve": mixins.RetrieveModelMixin,
    "update": mixins.UpdateModelMixin,
    "partial_update": mixins.UpdateModelMixin,
    "destroy": mixins.DestroyModelMixin,
}


def viewset_with(*permitted_methods: str) -> Any:
    assert all(
        method in METHOD_MIXINS for method in permitted_methods
    ), "Unrecognized method for ViewSet"
    return list(
        {
            mixin_class
            for method, mixin_class in METHOD_MIXINS.items()
            if method in permitted_methods
        }
    ) + [viewsets.GenericViewSet]


def weekday_iso_to_string(day_of_week: int) -> str:
    """
    Convert a weekday int (in ISO format, where Monday = 1) into a string
    """
    return DayOfWeekField.DAYS[day_of_week - 1]
