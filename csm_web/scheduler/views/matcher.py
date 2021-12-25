from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status
from rest_framework import viewsets

from ..models import Course, Mentor, MatcherPreference, MatcherSlot
from ..serializers import MatcherPreferenceSerializer, MatcherSlotSerializer
from .utils import viewset_with, get_object_or_error


class MatcherViewSet(*viewset_with("create", "retrieve")):
    def retrieve(self, request):
        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"])
    def slots(self, request, pk=None):
        """
        Endpoint: /api/matcher/<course_pk>/slots

        GET: Retrieves all slots for the given course.
            - mentors only
        POST: Creates new matcher slots for the given course.
            - coordinators only
            - delete all existing slots when receiving this POST request
            - maybe update with a PUT request?
        """
        if request.method == "GET":
            # get all slots
            course = get_object_or_error(Course.objects.all(), pk=pk)
            if not course.mentor_set.filter(user=request.user).exists():
                raise PermissionDenied("You must be a mentor for the course to submit this form.")
            slots = MatcherSlot.objects.filter(course=course)
            serializer = MatcherSlotSerializer(slots, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.method == "POST":
            # update possible slots
            course = get_object_or_error(Course.objects.all(), pk=pk)
            if not course.coordinator_set.filter(user=request.user).exists():
                raise PermissionDenied("You must be a coordinator for the course to submit this form.")

            """
            Request data:
            [{"times": [{"day": str, "start_time": str, "end_time": str}], "num_mentors": int}]
            """

            MatcherSlot.objects.filter(course=course).delete()

            for slot_json in request.data:
                curslot = MatcherSlot(
                    course=course,
                    times=slot_json["times"],
                    num_mentors=slot_json["num_mentors"],
                )
                curslot.save()
        return Response(status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"])
    def preferences(self, request, pk=None):
        """
        Endpoint: /api/matcher/<course_pk>/preferences

        GET: Returns all mentor preferences associated with a given course.
            - coordinators only
        POST: Updates the mentor preferences associated with a given course.
            - mentors only
        """
        if request.method == "GET":
            # get all mentor preferences
            course = get_object_or_error(Course.objects.all(), pk=pk)
            if not course.coordinator_set.filter(user=request.user).exists():
                raise PermissionDenied("You must be a coordinator for the course to submit this form.")
            preferences = MatcherPreference.objects.filter(slot__course=course)
            serializer = MatcherPreferenceSerializer(preferences, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        elif request.method == "POST":
            # update mentor preferences
            course = get_object_or_error(Course.objects.all(), pk=pk)
            if not course.mentor_set.filter(user=request.user).exists():
                raise PermissionDenied("You must be a mentor for the course to submit this form.")

            mentor = Mentor.objects.get(
                user=request.user, course=course, section__isnull=True
            )
            for pref in request.data:
                curslot = MatcherSlot.objects.get(pk=pref["id"])
                existing = MatcherPreference.objects.filter(slot=curslot, mentor=mentor)
                if existing.exists():
                    # update existing preference
                    existing.preference = pref["preference"]
                    existing.save()
                else:
                    # create new preference
                    new_pref = MatcherPreference(
                        slot=curslot, mentor=mentor, preference=pref["preference"]
                    )
                    new_pref.save()
            return Response(status=status.HTTP_200_OK)
        else:
            raise PermissionDenied()
