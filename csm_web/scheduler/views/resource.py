from django.core.exceptions import ValidationError
from django.http.response import JsonResponse
from drf_nested_forms.parsers import NestedJSONParser, NestedMultiPartParser
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import Course, Resource, Worksheet
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
        worksheets - list of objects describing individual worksheets, with name and worksheet, solution files
        """
        course = Course.objects.get(pk=pk)
        resources = Resource.objects.filter(course=pk)

        if request.method == "GET":
            # return all resources for current course as a response
            return Response(ResourceSerializer(resources, many=True).data)

        elif request.method in ("PUT", "POST"):
            # replace database entry for current course resources

            is_coordinator = course.coordinator_set.filter(user=request.user).exists()
            if not is_coordinator:
                raise PermissionDenied(
                    "You must be a coordinator to change resources data!"
                )

            resource = request.data
            # query by resource id, update resource with new info
            resource_query = None
            if "id" in resource and resource["id"]:
                resource_query = resources.filter(pk=resource["id"])

            if (
                resource_query is None or not resource_query.exists()
            ) and request.method == "POST":  # create new resource
                resource_obj = Resource()
                resource_obj.course = course
            elif resource_query.exists():  # get existing resource
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

            if "worksheets" in resource:
                # has edited worksheets
                for worksheet in resource["worksheets"]:
                    if worksheet["id"] != None:
                        # worksheet exists
                        worksheet_obj = Worksheet.objects.get(pk=worksheet["id"])
                        # delete if specified
                        if "deleted" in worksheet and len(worksheet["deleted"]) > 0:
                            toDelete = worksheet["deleted"]
                            if "worksheet" in toDelete:
                                num_deleted, _ = worksheet_obj.delete()
                                if num_deleted == 0:
                                    raise ValueError(
                                        f"Worksheet was unable to be deleted: {request.data}; {worksheet_obj}"
                                    )
                            else:
                                if (
                                    "worksheetFile" in toDelete
                                    and worksheet_obj.worksheet_file
                                ):
                                    worksheet_obj.worksheet_file.delete()
                                if (
                                    "solutionFile" in toDelete
                                    and worksheet_obj.solution_file
                                ):
                                    worksheet_obj.solution_file.delete()
                            continue  # continue with loop; do not parse other attributes in current worksheet
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
                        return JsonResponse(
                            e.message_dict, status=status.HTTP_400_BAD_REQUEST
                        )

                    worksheet_obj.save()
        elif request.method == "DELETE":
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
            else:
                num_deleted, _ = resource_query.delete()
                if num_deleted == 0:
                    raise ValueError(
                        f"Resource was unable to be deleted: {request.data}; {resource_query.get()}"
                    )

        return Response(status.HTTP_200_OK)
