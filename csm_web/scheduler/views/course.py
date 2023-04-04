import csv
from itertools import groupby

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Count, Prefetch, Q
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Course, Section, Spacetime, Student, User
from ..serializers import CourseSerializer, SectionSerializer, UserSerializer
from .utils import get_object_or_error, viewset_with


class CourseViewSet(*viewset_with("list")):
    serializer_class = CourseSerializer

    def get_queryset(self):
        """
        Fetch all courses, sorted by name.

        Excludes courses the user is banned from,
        also excludes courses that are past its valid date, unless the user is a coordinator.
        """
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
            .filter(
                # allow unrestricted or if associated
                (
                    Q(is_restricted=False)
                    | Q(coordinator__user=self.request.user)
                    | Q(mentor__user=self.request.user)
                    | Q(student__user=self.request.user)
                )
                # filter out restricted courses
                | (Q(is_restricted=True) & Q(whitelist=self.request.user))
            )
            .distinct()
        )

    def get_sections_by_day(self, course):
        """Get a course's sections, grouped by the days the section occurs."""
        sections = (
            # get all mentor sections
            Section.objects.select_related("mentor")
            .filter(mentor__course=course)
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
        # omit_spacetime_links makes it such that if a section is occuring online and therefore has
        # a link as its location, instead of the link being returned, just the word 'Online' is.
        # The reason we do this here is that we don't want desperate and/or malicious students
        # poking around in their browser devtools to be able to find links for sections they aren't
        # enrolled in and then go and crash them. omit_mentor_emails has a similar purpose.
        # omit_overrides is done for performance reasons, as we avoid the extra join since we don't
        # need actually need overrides here.
        #
        # Python's groupby assumes things are in sorted order, all it does is find the indices
        # where one group ends and the next begins, the DB is doing all the heavy lifting here.
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
        """
        Get course sections, grouped by date, along with metadata for whether the user
        is a coordinator for the course.
        """
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

    @action(detail=False)
    def students(self, request):
        """
        Get a list of student information (for a selection of courses) to add to coord interface.
        Currently only used for download.
        """
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

    @action(detail=True, methods=["get", "put", "delete"])
    def whitelist(self, request, pk=None):
        """
        GET: Retrieve a list of users currently whitelisted for the course.
        PUT: Add a list of emails to the course whitelist,
            creating users if they do not already exist.
        DELETE: Remove a list of emails from the course whitelist,
            ignoring users that have not been whitelisted.
        """
        course = get_object_or_error(self.get_queryset(), pk=pk)

        if request.method == "GET":
            whitelisted = course.whitelist.all()
            return Response(
                {"users": UserSerializer(whitelisted, many=True).data},
                status=status.HTTP_200_OK,
            )
        elif request.method == "PUT":
            for email in request.data["emails"]:
                if not email or "@" not in email:
                    # invalid or blank email
                    pass
                else:
                    username = email.split("@")[0]
                    user, _ = User.objects.get_or_create(username=username, email=email)
                    course.whitelist.add(user)
            return Response({}, status=status.HTTP_200_OK)
        elif request.method == "DELETE":
            for email in request.data["emails"]:
                if not email or "@" not in email:
                    # invalid or blank email
                    pass
                else:
                    username = email.split("@")[0]
                    userQueryset = User.objects.filter(username=username, email=email)
                    # do nothing if user is not whitelisted
                    if userQueryset.exists():
                        user = userQueryset.get()
                        course.whitelist.remove(user)
            return Response({}, status=status.HTTP_200_OK)

        raise PermissionDenied()

    @action(detail=True, methods=["PUT"])
    def config(self, request, pk=None):
        """
        Modify course settings.

        Endpoint is named `config` rather than `settings` because the name is used internally
        for the rest framework.
        """
        course = get_object_or_error(self.get_queryset(), pk=pk)

        if not request.user.coordinator_set.filter(course=course).exists():
            raise PermissionDenied(
                detail="Must be a coordinator to update course settings"
            )

        if "word_of_the_day_limit" in request.data:
            course.word_of_the_day_limit = request.data.get("word_of_the_day_limit")

        course.save()

        # return updated course
        serializer = CourseSerializer(course)
        return Response(serializer.data, status=status.HTTP_200_OK)
