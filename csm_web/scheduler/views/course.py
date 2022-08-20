import csv
import logging
from locale import atoi
from itertools import groupby
import pkgutil

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q, Count, Prefetch
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status

from .utils import get_object_or_error, viewset_with
from ..models import Course, Student, Spacetime, Section, Label
from ..serializers import CourseSerializer, LabelSerializer, SectionSerializer


class CourseViewSet(*viewset_with("list")):
    serializer_class = CourseSerializer

    def get_queryset(self):
        banned_from = self.request.user.student_set.filter(banned=True).values_list(
            "section__mentor__course__id", flat=True
        )
        now = timezone.now().astimezone(timezone.get_default_timezone())
        return (
            Course.objects.exclude(pk__in=banned_from)
            .order_by("name")
            .filter(
                Q(valid_until__gte=now.date()) | Q(coordinator__user=self.request.user)
            )
            .distinct()
        )
        # Q(valid_until__gte=now.date(), enrollment_start__lte=now, enrollment_end__gt=now) | Q(coordinator__user=self.request.user)).distinct()

    def get_sections_by_day(self, course):
        sections = (
            # get all mentor sections
            Section.objects.select_related('mentor').filter(mentor__course=course)
            .annotate(
                day_key=ArrayAgg(
                    "spacetimes__day_of_week",
                    ordering="spacetimes__day_of_week",
                    distinct=True,
                ),
                time_key=ArrayAgg(
                    "spacetimes__start_time",
                    ordering="spacetimes__start_time",
                    distinct=True,
                ),
            )
            .order_by("day_key", "time_key")
            .prefetch_related(
                Prefetch(
                    "spacetimes",
                    queryset=Spacetime.objects.order_by("day_of_week", "start_time"),
                )
            )
            .select_related("mentor__user")
            .annotate(
                num_students_annotation=Count(
                    "students", filter=Q(students__active=True), distinct=True
                )
            )
        )
        """
        omit_spacetime_links makes it such that if a section is occuring online and therefore has a link
        as its location, instead of the link being returned, just the word 'Online' is. The reason we do this here is
        that we don't want desperate and/or malicious students poking around in their browser devtools to be able to find
        links for sections they aren't enrolled in and then go and crash them. omit_mentor_emails has a similar purpose.
        omit_overrides is done for performance reasons, as we avoid the extra join since we don't need actually need overrides here.

        Python's groupby assumes things are in sorted order, all it does is essentially find the indices where
        one group ends and the next begins, the DB is doing all the heavy lifting here.
        """
        return {
            day_key: SectionSerializer(
                group,
                many=True,
                context={
                    "omit_spacetime_links": True,
                    "omit_mentor_emails": True,
                    "omit_overrides": True,
                },
            ).data
            for day_key, group in groupby(sections, lambda section: section.day_key)
        }

    @action(detail=True, methods=["GET", "PUT"])
    def labels(self, request, pk=None):
        '''
        GET: api/course/<course_id>/labels
        returns all the labels associated with a course
        POST: api/course/<course_id>/labels
        adds a new label to the course with <course_id>
        - format: { "name": string, "description": string, "showPopup": boolean }
        PUT: api/course/<course_id>/labels
        - format: { labels: [{id: int, name: string, description: string, showPopup: bool}, {...}, {...}] 
                    deletedLabelIDs: [<list of ids of labels getting deleted>]    }

        '''
        # GET all the labels associated with a course
        logging.error("KIRBYKIRBY" + request.method)
        if request.method == "GET":

            course = get_object_or_error(self.get_queryset(), pk=pk)
            labels = course.labels
            serializer = LabelSerializer(labels, many=True)

            return Response(serializer.data, status=status.HTTP_200_OK)  # ???
            # create a new label with the request data
            """
            elif request.method == "POST":
                label = Label.objects.create(
                    name=request.data.get("name"),
                    description=request.data.get("description"),
                    showPopup=request.data.get("showPopup"),
                    course=pk
                )
                serializer = LabelSerializer(labels, many=False)
                return Response(serializer.data, status=status.HTTP_201_CREATED)"""
        logging.error("KIRBYKIRBYKIRBYKIRBYKIRBYKIRBYKIRBYKIRBYKIRBYKIRBYKIRBYKIRBYKIRBY")
        if request.method == "PUT":
            # filter out labels associated with course_id
            # iterate through them, and for each one check if ID is in PUT request
            # if not, it is deleted, so we should delete it from database
            # if it is there, we just edit it
            # if it is ONLY in the request, we are adding a new label, so we create and save a new label

            # but this require first iterating through the database labels (for the right course) and THEN the request... is this normal?

            # get list of all IDs in request?

            # relevant database labels
            # logging.error("Log message goes here.")
            logging.error(request.data)
            currentLabels = request.data.get("labels")
            for labelJSON in currentLabels:
                # check if JSON has id field
                labelID = labelJSON.get("id")
                if labelID >= 0:
                    # case of editing existing label
                    label = Label.objects.get(pk=labelID)

                    # retrieve
                    name = labelJSON.get("name")
                    description = labelJSON.get("description")
                    showPopup = labelJSON.get("show_popup")
                    # update
                    if name is not None:
                        label.name = name
                    if description is not None:
                        label.description = description
                    if showPopup is not None:
                        label.showPopup = showPopup

                    serializer = LabelSerializer(label, data=labelJSON)
                    if serializer.is_valid():
                        serializer.save()
                else:
                    # case of adding new label
                    label = Label.objects.create(
                        name=labelJSON.get("name"),
                        description=labelJSON.get("description"),
                        showPopup=labelJSON.get("show_popup"),
                        course=Course.objects.get(pk=pk)
                    )

            # iterate through deleted label IDs to delete from database
            deletedLabelIDs = request.data.get("deleted_label_ids")
            # logging.error("ajklsdhgjksgklshgsgdsl" + deletedLabelIDs)
            if deletedLabelIDs != []:
                for labelID in deletedLabelIDs:
                    # LABEL ID'S ARE STRINGS, NEED TO PARSE FOR INTEGERS
                    # labelIDint = atoi(labelID)
                    labelToDelete = Label.objects.get(pk=labelID)
                    logging.info(labelToDelete)
                    labelToDelete.delete()

            """
            serializer = LabelSerializer(currentLabels, many=True)
            return Response(serializer.data, status.HTTP_202_ACCEPTED)
            """
            return Response(status.HTTP_202_ACCEPTED)

            """
            label_id = request.data.get("labelId")
            label = Label.objects.get(id=label_id)

            # retrieve
            name = request.data.get("name")
            description = request.data.get("description")
            showPopup = request.data.get("showPopup")

            # validate
            if name is not None:
                label.name = name
            if description is not None:
                label.description = description
            if showPopup is not None:
                label.showPopup = showPopup

            label.save()
            serializer = LabelSerializer(label, many=False)
            return Response(serializer.data, status.HTTP_202_ACCEPTED)
        elif request.method == "DELETE":
            label_id = request.data.get("labelId")
            label = Label.objects.get(id=label_id)

            label.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)  # ???

            # Label.objects.filter(id=label_id).delete()
            """

    # @action(detail=True)
    # def delete_label(self, request, pk=None):
    #     course = get_object_or_error(self.get_queryset(), pk=pk)

    @action(detail=True)
    def sections(self, request, pk=None):
        course = get_object_or_error(self.get_queryset(), pk=pk)
        sections_by_day = self.get_sections_by_day(course)
        return Response(
            {
                "userIsCoordinator": course.coordinator_set.filter(
                    user=request.user
                ).exists(),
                "sections": sections_by_day,
            }
        )

    # get a list of student information (for a selection of courses) to add to coord interface -- currently only used for download
    @action(detail=False)
    def students(self, request):
        id_str = self.request.query_params.get("ids")
        if not id_str or id_str == "/":
            return Response({"students": None})
        if id_str[-1] == "/":
            id_str = id_str[:-1]
        ids = id_str.split(",")
        studs = Student.objects.select_related("user", "section__mentor").filter(
            active=True, section__mentor__course__in=ids
        )

        response = HttpResponse(content_type="text/csv")
        response[
            "Content-Disposition"
        ] = 'attachment; filename="csm-student-emails.csv"'
        writer = csv.writer(response)

        for s in studs:
            writer.writerow([s.user.email])
        return response
