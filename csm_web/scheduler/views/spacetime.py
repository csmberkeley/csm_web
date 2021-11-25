from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import viewsets

from .utils import log_str, logger, get_object_or_error
from ..models import Spacetime
from ..serializers import SpacetimeSerializer, OverrideSerializer


class SpacetimeViewSet(viewsets.GenericViewSet):
    serializer_class = Spacetime

    def get_queryset(self):
        return Spacetime.objects.filter(
            Q(section__mentor__user=self.request.user)
            | Q(section__mentor__course__coordinator__user=self.request.user)
        ).distinct()

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
            return Response(status=status.HTTP_202_ACCEPTED)
        logger.error(
            f"<Spacetime:Failure> Could not modify Spacetime {log_str(spacetime)}, errors: {serializer.errors}"
        )
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)

    @action(detail=True, methods=["put"])
    def override(self, request, pk=None):
        spacetime = get_object_or_error(self.get_queryset(), pk=pk)
        if hasattr(spacetime, "_override"):  # update
            serializer = OverrideSerializer(spacetime._override, data=request.data)
            status_code = status.HTTP_202_ACCEPTED
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
            return Response(status=status_code)
        logger.error(
            f"<Override:Failure> Could not override Spacetime {log_str(spacetime)}, errors: {serializer.errors}"
        )
        return Response(serializer.errors, status=status.HTTP_422_UNPROCESSABLE_ENTITY)
