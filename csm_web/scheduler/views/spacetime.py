from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Spacetime
from ..serializers import OverrideSerializer, SpacetimeSerializer
from .utils import get_object_or_error, log_str, logger


class SpacetimeViewSet(viewsets.GenericViewSet):
    serializer_class = Spacetime

    def get_queryset(self):
        return Spacetime.objects.filter(
            Q(section__mentor__user=self.request.user)
            | Q(section__mentor__course__coordinator__user=self.request.user)
        ).distinct()

    def destroy(self, request, pk=None):
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)
        section = spacetime.section
        course = section.mentor.course

        is_coordinator = course.coordinator_set.filter(user=request.user).exists()
        if not is_coordinator:
            logger.error(
                f"<Spacetime Deletion:Failure> Could not delete spacetime, user {log_str(request.user)} does not have proper permissions"
            )
            raise PermissionDenied(
                "You must be a coordinator to delete this spacetime!"
            )

        has_multiple_spacetimes = section.spacetimes.count() > 1
        if not has_multiple_spacetimes:
            logger.error(
                f"<Spacetime Deletion:Failure> Could not delete spacetime, only one spacetime exists"
            )
            return Response(
                status=status.HTTP_400_BAD_REQUEST,
                data={"error": "Only one spacetime left!"},
            )

        now = timezone.now().astimezone(timezone.get_default_timezone())

        # FIX ME: Once issue #303 is resolved, this should delete the directly related section occurences
        future_sectionOccurrences = section.sectionoccurrence_set.filter(
            date__gte=now.date(), date__week_day=spacetime.day_number()
        )

        with transaction.atomic():
            spacetime.delete()
            future_sectionOccurrences.delete()

        logger.info(
            f"<Spacetime Deletion:Success> Deleted Spacetime {log_str(spacetime)}"
        )

        serializer = SpacetimeSerializer(spacetime)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["put"])
    def modify(self, request, pk=None):
        """Permanently modifies a spacetime, ignoring the override field."""
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)
        serializer = SpacetimeSerializer(spacetime, data=request.data, partial=True)
        if serializer.is_valid():
            new_spacetime = serializer.save()
            logger.info(
                f"<Spacetime:Success> Modified Spacetime {log_str(new_spacetime)} (previously {log_str(spacetime)})"
            )
            return Response(serializer.data, status=status.HTTP_200_OK)
        logger.error(
            f"<Spacetime:Failure> Could not modify Spacetime {log_str(spacetime)}, errors: {serializer.errors}"
        )
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    @action(detail=True, methods=["put", "delete"])
    def override(self, request, pk=None):
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)

        if request.method == "PUT":
            if hasattr(spacetime, "_override"):  # update
                serializer = OverrideSerializer(spacetime._override, data=request.data)
                status_code = status.HTTP_200_OK
            else:  # create
                serializer = OverrideSerializer(
                    data={"overriden_spacetime": spacetime.pk, **request.data}
                )
                status_code = status.HTTP_201_CREATED
            if serializer.is_valid():
                override = serializer.save()
                logger.info(
                    f"<Override:Success> Overrode Spacetime {log_str(spacetime)} with Override {log_str(override)}"
                )
                return Response(serializer.data, status=status_code)
            logger.error(
                f"<Override:Failure> Could not override Spacetime {log_str(spacetime)}, errors: {serializer.errors}"
            )
            return Response(
                serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )

        elif request.method == "DELETE":
            mentor = spacetime.section.mentor
            course = mentor.course

            is_mentor = mentor.user == request.user
            is_coordinator = course.coordinator_set.filter(user=request.user).exists()
            if not (is_mentor or is_coordinator):
                logger.error(
                    f"<Override Deletion:Failure> Could not delete override, user {log_str(request.user)} does not have proper permissions"
                )
                raise PermissionDenied(
                    "You must be a mentor or a coordinator to delete this spacetime override!"
                )

            if hasattr(spacetime, "_override"):
                override = spacetime._override
                override.delete()
            else:
                return Response(
                    {"error": "spacetime has no override"},
                    status=status.HTTP_422_UNPROCESSABLE_ENTITY,
                )

            logger.info(
                f"<Override Deletion:Success> Deleted override for {log_str(spacetime)}"
            )
            serializer = OverrideSerializer(override)
            return Response(serializer.data, status=status.HTTP_200_OK)
