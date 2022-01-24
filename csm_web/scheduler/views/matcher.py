from rest_framework.decorators import action, api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework import status

from django.db.models.query import EmptyQuerySet
from django.views.decorators.http import require_http_methods

from scheduler.models import User, Course, Mentor, MatcherPreference, MatcherSlot
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
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    if request.method == "GET":
        # get all slots
        is_mentor = course.mentor_set.filter(user=request.user).exists()
        if not (is_coordinator or is_mentor):
            raise PermissionDenied(
                "You must be a mentor for the course to submit this form."
            )
        slots = MatcherSlot.objects.filter(course=course)
        serializer = MatcherSlotSerializer(slots, many=True)
        print(serializer.data)
        return Response({"slots": serializer.data}, status=status.HTTP_200_OK)
    elif request.method == "POST":
        # update possible slots
        if not is_coordinator:
            raise PermissionDenied(
                "You must be a coordinator for the course to submit this form."
            )

        """
        Request data:
        [{"times": [{"day": str, "startTime": str, "endTime": str}], "numMentors": int}]
        """

        MatcherSlot.objects.filter(course=course).delete()

        for slot_json in request.data["slots"]:
            times = slot_json["times"]
            num_mentors = (
                slot_json["numMentors"] if "numMentors" in slot_json else 0
            )
            curslot = MatcherSlot(
                course=course,
                times=times,
                num_mentors=num_mentors,
            )
            curslot.save()
    return Response(status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
def preferences(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/preferences

    GET: Returns all mentor preferences associated with a given course.
        - coordinators only
        - return format: {
            "open": bool,
            "preferences": [
                {"slot": int, "mentor": int, "preference": int},
            ...]
        }
    GET: Returns all mentor preferences for a single mentor associated with a given course.
        - mentors only
        - format: {"preferences": [{"slot": int, "mentor": int, "preference": int}, ...]}
    POST: Updates the mentor preferences associated with a given course.
        - mentors only
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    is_mentor = course.mentor_set.filter(user=request.user).exists()
    if request.method == "GET":
        # get all mentor preferences
        if not (is_coordinator or is_mentor):
            raise PermissionDenied(
                "You must be a coordinator or mentor for the course to submit this form."
            )

        preferences = MatcherPreference.objects.filter(slot__course=course)
        if is_mentor:
            # filter only this mentor's preferences
            preferences = preferences.filter(mentor__user=request.user)
        serializer = MatcherPreferenceSerializer(preferences, many=True)
        return Response({"responses": serializer.data}, status=status.HTTP_200_OK)
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
        return Response(
            {"skipped": skipped}, status=status.HTTP_200_OK
        )
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
        return Response(
            {"skipped": skipped_serializer.data}, status=status.HTTP_200_OK
        )

    raise PermissionDenied()


@api_view(["GET", "PUT"])
def assignment(request, pk=None):
    return Response([], status=status.HTTP_200_OK)
