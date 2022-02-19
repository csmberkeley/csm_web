import csv
from itertools import groupby

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Q, Count, Prefetch
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response

from .utils import get_object_or_error, viewset_with
from ..models import Course, Student, Spacetime, Section
from ..serializers import CourseSerializer, SectionSerializer


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
