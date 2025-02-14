from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import QuerySet
from django.http.response import JsonResponse
from django.utils import timezone
from django.utils.timezone import datetime
from drf_nested_forms.parsers import NestedJSONParser, NestedMultiPartParser
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from scheduler.tasks.schedule_resource import (
    WorksheetType,
    clear_schedule,
    update_schedule,
)

from ..models import Course, Link, Resource, Worksheet
from ..serializers import ResourceSerializer


class ResourceViewSet(viewsets.GenericViewSet, APIView):
    serializer_class = ResourceSerializer
    parser_classes = [FormParser, NestedJSONParser, NestedMultiPartParser]

    def get_queryset(self):
        return Resource.objects.all()

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

        is_coordinator = course.coordinator_set.filter(user=request.user).exists()

        if request.method == "GET":
            # return all resources for current course as a response
            # if a coordinator for the course requested the resources information,
            # the resources should always include all uploaded files.
            serializer = ResourceSerializer(
                resources, many=True, context={"show_all_scheduled": is_coordinator}
            )
            return Response(serializer.data)

        if request.method in ("PUT", "POST"):
            # replace database entry for current course resources

            if not is_coordinator:
                raise PermissionDenied(
                    "You must be a coordinator to change resources data!"
                )

            early_response = update_resource(request, course, resources)
            if early_response is not None:
                return early_response
        if request.method == "DELETE":
            # remove resource from db
            is_coordinator = course.coordinator_set.filter(user=request.user).exists()
            if not is_coordinator:
                raise PermissionDenied(
                    "You must be a coordinator to change resources data!"
                )
            resource = request.data
            resource_query = resources.filter(pk=resource["id"])
            if not resource_query.exists():  # resource to delete does not exist
                raise ValueError(
                    f"Resource object to delete does not exist: {request.data}"
                )

            num_deleted, _ = resource_query.delete()
            if num_deleted == 0:
                raise ValueError(
                    f"Resource was unable to be deleted: {request.data}; {resource_query.get()}"
                )

        return Response(status.HTTP_200_OK)


@transaction.atomic
def update_resource(request: Request, course: Course, resources: QuerySet[Resource]):
    """
    Atomically update/create the resource, along with any associated worksheets or links.
    """
    resource: dict = request.data
    resource_query = None
    if "id" in resource and resource["id"]:
        resource_query = resources.filter(pk=resource["id"])

    if (
        resource_query is None or not resource_query.exists()
    ) and request.method == "POST":  # create new resource
        resource_obj = Resource()
        resource_obj.course = course
    elif (
        resource_query is not None and resource_query.exists()
    ):  # get existing resource
        resource_obj = resource_query.get()
    else:  # not POST and resource not found
        raise ValueError(f"Resource object to query does not exist: {request.data}")

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

    if "links" in resource:
        for link in resource["links"]:
            if link["id"] is not None:
                link_obj = Link.objects.get(pk=link["id"])
                if "deleted" in link and link["deleted"]:
                    num_deleted, _ = link_obj.delete()
                    if num_deleted == 0:
                        raise ValueError(
                            f"Link was unable to be deleted: {request.data}; {link_obj}"
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

    if "worksheets" in resource:
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
                                "Worksheet was unable to be deleted:"
                                f" {request.data}; {worksheet_obj}"
                            )
                    else:
                        if (
                            "worksheetFile" in to_delete
                            and worksheet_obj.worksheet_file
                        ):
                            worksheet_obj.worksheet_file.delete()
                        if "solutionFile" in to_delete and worksheet_obj.solution_file:
                            worksheet_obj.solution_file.delete()
                    # continue with loop; do not parse other attributes in current worksheet
                    continue
            else:
                # create new worksheet
                worksheet_obj = Worksheet(resource=resource_obj)

            worksheet_obj.name = worksheet.get("name", None)

            # do a validate and save before touching the worksheet files first,
            # so that the worksheet ID is autopopulated.
            try:
                worksheet_obj.full_clean()
            except ValidationError as e:
                return JsonResponse(e.message_dict, status=status.HTTP_400_BAD_REQUEST)
            worksheet_obj.save()

            # at this point, worksheet_obj.id will always be populated with a valid ID

            # check if files were uploaded as part of the request (they won't be strings if so)
            if not isinstance(worksheet.get("worksheetFile", ""), str):
                worksheet_obj.worksheet_file = worksheet["worksheetFile"]
            if not isinstance(worksheet.get("solutionFile", ""), str):
                worksheet_obj.solution_file = worksheet["solutionFile"]

            for key, enum in [
                ("worksheetSchedule", WorksheetType.WORKSHEET),
                ("solutionSchedule", WorksheetType.SOLUTION),
            ]:
                if key in worksheet:
                    schedule_str = worksheet[key]

                    if schedule_str is not None:
                        # parse schedule as datetime with timezone
                        try:
                            parsed_datetime = datetime.fromisoformat(
                                schedule_str
                            ).astimezone(timezone.get_default_timezone())
                            update_schedule(
                                worksheet_obj,
                                enum,
                                parsed_datetime,
                            )
                        except ValueError:
                            return JsonResponse(
                                {"error": "Invalid schedule datetime given"},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                    else:
                        # clear schedule
                        clear_schedule(worksheet_obj, enum)

            try:  # validate
                worksheet_obj.full_clean()
            except ValidationError as e:
                return JsonResponse(e.message_dict, status=status.HTTP_400_BAD_REQUEST)

            worksheet_obj.save()

    # no early response to return here
    return None
