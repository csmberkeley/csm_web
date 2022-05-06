from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status

from django.db.models.query import EmptyQuerySet
from django.views.decorators.http import require_http_methods
from django.db import transaction

from scheduler.models import User, Course, Mentor, Matcher, MatcherPreference, MatcherSlot
from scheduler.serializers import (
    MatcherPreferenceSerializer,
    MatcherSlotSerializer,
    MentorSerializer,
    ProfileSerializer,
)
from .utils import viewset_with, get_object_or_error


@api_view(["GET", "POST"])
def slots(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/slots

    GET: Retrieves all slots for the given course.
        - coordinators or mentors only
        - return format: {"slots": [{"id": int, "times": JSON_string}, ...]}
    POST: Creates new matcher slots for the given course.
        - coordinators only
        - delete all existing slots when receiving this POST request
        - maybe update with a PUT request?
        - format: [{"times": [{"day": str, "startTime": str, "endTime": str}], "numMentors": int}]

        - to release/close preference submissions:
            {"release": bool}
    """
    course = get_object_or_error(Course.objects, pk=pk)
    matcher = course.matcher
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    if request.method == "GET":
        # get all slots
        is_mentor = course.mentor_set.filter(user=request.user).exists()
        if not (is_coordinator or is_mentor):
            raise PermissionDenied(
                "You must be a mentor for the course to submit this form."
            )
        if matcher is None:
            # haven't set up the matcher yet
            return Response({"slots": []}, status=status.HTTP_200_OK)

        slots = MatcherSlot.objects.filter(matcher=matcher)
        serializer = MatcherSlotSerializer(slots, many=True)
        print(serializer.data)
        return Response({"slots": serializer.data}, status=status.HTTP_200_OK)
    elif request.method == "POST":
        # update possible slots
        if not is_coordinator:
            raise PermissionDenied(
                "You must be a coordinator for the course to submit this form."
            )

        if matcher is None:
            # create matcher
            matcher = Matcher(course=course)
            matcher.save()

        """
        Request data:
        [{"times": [{"day": str, "startTime": str, "endTime": str}], "numMentors": int}]
        """

        if "slots" in request.data:
            MatcherSlot.objects.filter(matcher=matcher).delete()

            for slot_json in request.data["slots"]:
                times = slot_json["times"]
                min_mentors = (
                    slot_json["minMentors"] if "minMentors" in slot_json else 0
                )
                max_mentors = (
                    slot_json["maxMentors"] if "maxMentors" in slot_json else 1000
                )
                curslot = MatcherSlot(
                    matcher=matcher,
                    times=times,
                    min_mentors=min_mentors,
                    max_mentors=max_mentors,
                )
                curslot.save()

        return Response(status=status.HTTP_202_ACCEPTED)

    return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(["GET", "POST"])
def preferences(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/preferences

    GET: Returns all mentor preferences associated with a given course.
        - coordinators only
        - return format: {
            "open": bool,
            "responses": [
                {"slot": int, "mentor": int, "preference": int},
            ...]
        }
    GET: Returns all mentor preferences for a single mentor associated with a given course.
        - mentors only
        - format: {"responses": [{"slot": int, "mentor": int, "preference": int}, ...]}
    POST: Updates the mentor preferences associated with a given course.
        - mentors only
        - format: [{"id": int, "preference": int}]
            where id is the slot id
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    matcher = course.matcher
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    is_mentor = course.mentor_set.filter(user=request.user).exists()
    if request.method == "GET":
        # get all mentor preferences
        if not (is_coordinator or is_mentor):
            raise PermissionDenied(
                "You must be a coordinator or mentor for the course to submit this form."
            )

        if matcher is None:
            # haven't set up the matcher yet
            return Response({"responses": []}, status=status.HTTP_200_OK)

        preferences = MatcherPreference.objects.filter(slot__matcher=matcher)
        if is_mentor:
            # filter only this mentor's preferences
            preferences = preferences.filter(mentor__user=request.user)
        serializer = MatcherPreferenceSerializer(preferences, many=True)
        return Response(
            {"responses": serializer.data, "open": matcher.is_open},
            status=status.HTTP_200_OK,
        )
    elif request.method == "POST":
        # update mentor preferences
        if not is_mentor:
            raise PermissionDenied(
                "You must be a mentor for the course to submit this form."
            )

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


@api_view(["GET", "POST", "DELETE"])
def mentors(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/mentors

    GET: Gets all mentors associated with the course
        - coordinators only
        - return format: {"mentors": [{mentor model}, ...]}
    POST: Adds new mentors to the course
        - coordinators only
        - format: {"mentors": [email, ...]}
        - error return: {"skipped": [{mentor model}, ...]}
    DELETE: Deletes mentors from the course (must be mentors with no associated section)
        - coordinators only
        - format: {"mentors": [email, ...]}
        - error return: {"skipped": [{mentor model}, ...]}
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    if not is_coordinator:
        raise PermissionDenied(
            "You must be a coordinator to modify the mentors of a course."
        )

    if request.method == "GET":
        queryset = Mentor.objects.filter(course=course, section=None)
        serializer = MentorSerializer(queryset, many=True)
        return Response({"mentors": serializer.data}, status=status.HTTP_200_OK)
    elif request.method == "POST":
        # add new mentors to course
        skipped = []
        # users already associated with the course as a mentor
        users_with_course = User.objects.filter(mentor__course=course)
        for email in request.data["mentors"]:
            username = email.split("@")[0]  # username is everything before @
            # use existing user, or create a new user if it doesnt exist
            user, _ = User.objects.get_or_create(username=username, email=email)
            # if mentor exists, skip
            if user in users_with_course:
                skipped.append(email)
                continue
            # create new mentor
            created = Mentor.objects.create(user=user, course=course)
            print("created", created)
        print(skipped)
        return Response({"skipped": skipped}, status=status.HTTP_200_OK)
    elif request.method == "DELETE":
        # delete mentors from course
        skipped = []
        for email in request.data["mentors"]:
            try:
                mentor = Mentor.objects.get(
                    course=course, user__email=email, section=None
                )
                print("deleted", mentor)
                mentor.delete()
            except Mentor.DoesNotExist:
                skipped.append(email)
        skipped_serializer = MentorSerializer(skipped, many=True)
        return Response({"skipped": skipped_serializer.data}, status=status.HTTP_200_OK)

    raise PermissionDenied()


@api_view(["POST"])
def configure(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/configure

    POST: Update the matcher configuration
        - coordinators only
        - open/close form:
            - format: {"open": bool}
        - update slot mentor count:
            - format: {"slots": [{"slot": int, "minMentors": int, "maxMentors": int}, ...]}
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    matcher = course.matcher
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    if request.method == "POST":
        if not is_coordinator:
            raise PermissionDenied(
                "You must be a coordinator to modify the matcher configuration."
            )

        if "slots" in request.data:
            # update slot configuration
            with transaction.atomic():
                for slot in request.data:
                    curslot = MatcherSlot.objects.get(pk=slot["slot"])
                    if "minMentors" in slot:
                        curslot.min_mentors = slot["minMentors"]
                    if "maxMentors" in slot:
                        curslot.max_mentors = slot["maxMentors"]
                    curslot.save()

        if "open" in request.data:
            matcher.is_open = request.data["open"]
            matcher.save()

        return Response(status=status.HTTP_200_OK)

    raise PermissionDenied()


@api_view(["GET", "PUT"])
def assignment(request, pk=None):
    return Response([], status=status.HTTP_200_OK)
