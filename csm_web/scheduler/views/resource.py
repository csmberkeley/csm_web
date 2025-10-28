# from datetime import datetime, timedelta, timezone
import datetime

from django.core.exceptions import ValidationError
from django.db import models
from django.http.response import JsonResponse
from django.utils import timezone
from drf_nested_forms.parsers import NestedJSONParser, NestedMultiPartParser
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from scheduler.utils.sign_document import sign_document

from ..models import Course, Link, Resource, Worksheet
from ..serializers import ResourceSerializer


class ResourceViewSet(viewsets.GenericViewSet, APIView):
    serializer_class = ResourceSerializer
    parser_classes = [FormParser, NestedJSONParser, NestedMultiPartParser]

    def get_queryset(self):
        return Resource.objects.all()

    def _require_coordinator(self, course, request):
        is_coordinator = course.coordinator_set.filter(user=request.user).exists()
        if not is_coordinator:
            raise PermissionDenied(
                "You must be a coordinator to change resources data!"
            )

    def _update_links(self, resource, resource_obj, request):
        if "links" not in resource:
            return None

        for link in resource["links"]:
            if link["id"] is not None:
                link_obj = Link.objects.get(pk=link["id"])
                if "deleted" in link and link["deleted"]:
                    num_deleted, _ = link_obj.delete()
                    if num_deleted == 0:
                        raise ValueError(
                            "Link was unable to be deleted: "
                            f"{request.data}; {link_obj}"
                        )
                    continue
            else:
                # create new link
                link_obj = Link(resource=resource_obj)

            if not ("deleted" in link and link["deleted"]):
                link_obj.name = link.get("name", None)
                link_obj.url = link.get("url", None)

            try:  # validate
                link_obj.full_clean()
            except ValidationError as e:
                return JsonResponse(e.message_dict, status=status.HTTP_400_BAD_REQUEST)

            link_obj.save()
        return None

    def _schedule_solution(self, worksheet_obj):
        if not worksheet_obj.solution_file:
            return

        start_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
            seconds=15
        )
        end_time = start_time + datetime.timedelta(days=6)
        worksheet_obj.solution_url = sign_document(
            f"https://dysweoslr1ko6.cloudfront.net/{worksheet_obj.solution_file}",
            start_time,
            end_time,
        )
        worksheet_obj.start_time = start_time
        worksheet_obj.end_time = end_time
        worksheet_obj.save()

    def _update_worksheets(self, resource, resource_obj, request):
        if "worksheets" not in resource:
            return None

        # has edited worksheets
        for worksheet in resource["worksheets"]:
            if worksheet["id"] is not None:
                # worksheet exists
                worksheet_obj = Worksheet.objects.get(pk=worksheet["id"])
                # delete if specified
                if "deleted" in worksheet and len(worksheet["deleted"]) > 0:
                    to_delete = worksheet["deleted"]
                    if "worksheet" in to_delete:
                        num_deleted, _ = worksheet_obj.delete()
                        if num_deleted == 0:
                            raise ValueError(
                                "Worksheet was unable to be deleted: "
                                f"{request.data}; {worksheet_obj}"
                            )
                    else:
                        if (
                            "worksheetFile" in to_delete
                            and worksheet_obj.worksheet_file
                        ):
                            worksheet_obj.worksheet_file.delete()
                        if "solutionFile" in to_delete and worksheet_obj.solution_file:
                            worksheet_obj.solution_file.delete()
                    # continue with loop; do not parse other attributes
                    continue
            else:
                # create new worksheet
                worksheet_obj = Worksheet(resource=resource_obj)

            worksheet_obj.name = worksheet.get("name", None)
            if not isinstance(worksheet["worksheetFile"], str):
                worksheet_obj.worksheet_file = worksheet["worksheetFile"]
            if not isinstance(worksheet["solutionFile"], str):
                worksheet_obj.solution_file = worksheet["solutionFile"]

            try:  # validate
                worksheet_obj.full_clean()
            except ValidationError as e:
                return JsonResponse(e.message_dict, status=status.HTTP_400_BAD_REQUEST)

            worksheet_obj.save()
            self._schedule_solution(worksheet_obj)
        return None

    @action(detail=True, methods=["get", "put", "post", "delete"])
    def resources(self, request, pk=None):
        """
        Endpoint: /api/resources/<course_id>/resources
        Returns all resources for the course, or edits resources for the course

        request data:
        weekNum - week number corresponding to resource
        date - week starting date corresponding to resource
        topics - topics, delimited by a semicolon
        links - list of objects for individual links (name and url)
        worksheets - list of objects describing individual worksheets,
            with name and worksheet, solution files
        """
        course = Course.objects.get(pk=pk)
        resources = Resource.objects.filter(course=pk)

        if request.method == "GET":
            # return all resources for current course as a response
            print(
                resources.prefetch_related(
                    models.Prefetch(
                        "worksheet_set",
                        queryset=Worksheet.objects.filter(
                            start_time__gte=timezone.now()
                        ),
                    )
                )
            )
            return Response(
                ResourceSerializer(
                    resources.prefetch_related(
                        models.Prefetch(
                            "worksheet_set",
                            queryset=Worksheet.objects.filter(
                                start_time__lte=timezone.now()
                            ),
                        )
                    ),
                    many=True,
                ).data
            )

        if request.method in ("PUT", "POST"):
            # replace database entry for current course resources
            self._require_coordinator(course, request)

            resource = request.data
            print("RESOURCE DATA:", resource)
            # query by resource id, update resource with new info
            resource_query = None
            if "id" in resource and resource["id"]:
                resource_query = resources.filter(pk=resource["id"])

            if (
                resource_query is None or not resource_query.exists()
            ) and request.method == "POST":  # create new resource
                resource_obj = Resource()
                resource_obj.course = course
            elif resource_query is not None and resource_query.exists():
                resource_obj = resource_query.get()
            else:  # not POST and resource not found
                raise ValueError(
                    f"Resource object to query does not exist: {request.data}"
                )

            resource_obj.week_num = resource.get("weekNum", None)  # invalid if blank
            resource_obj.date = resource.get("date", None)  # invalid if blank
            if (
                not resource_obj.date
            ):  # if empty string, set blank field to get a better validation detail
                resource_obj.date = None
            resource_obj.topics = resource.get("topics", "")  # default to empty string

            try:  # validate
                resource_obj.full_clean()
            except ValidationError as e:
                return JsonResponse(e.message_dict, status=status.HTTP_400_BAD_REQUEST)
            resource_obj.save()

            link_error = self._update_links(resource, resource_obj, request)
            if link_error is not None:
                return link_error

            worksheet_error = self._update_worksheets(resource, resource_obj, request)
            if worksheet_error is not None:
                return worksheet_error

        elif request.method == "DELETE":
            # remove resource from db
            self._require_coordinator(course, request)
            resource = request.data
            resource_query = resources.filter(pk=resource["id"])
            if not resource_query.exists():  # resource to delete does not exist
                raise ValueError(
                    f"Resource object to delete does not exist: {request.data}"
                )
            num_deleted, _ = resource_query.delete()
            if num_deleted == 0:
                raise ValueError(
                    "Resource was unable to be deleted: "
                    f"{request.data}; {resource_query.get()}"
                )

        return Response(status.HTTP_200_OK)
