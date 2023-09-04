import datetime

from django.db import transaction
from django.db.models import Q
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.models import (
    Course,
    Matcher,
    MatcherPreference,
    MatcherSlot,
    Mentor,
    Section,
    Spacetime,
    User,
)
from scheduler.serializers import (
    MatcherPreferenceSerializer,
    MatcherSlotSerializer,
    MentorSerializer,
)
from scheduler.utils.match_solver import (
    MentorTuple,
    PreferenceTuple,
    SlotTuple,
    get_matches,
)

from .utils import get_object_or_error, logger

DEFAULT_CAPACITY = 5
TIME_FORMAT = "%H:%M"  # Assuming 24-hour format in hh:mm
DEFAULT_LOCATION = "TBD"


@api_view(["GET"])
def active(request):
    """
    Endpoint: /api/matcher/active

    GET: Returns a list of course ids for active matchers related to the user.
        - if the user is a mentor (with no section) in a course that is not open,
          the course id will not be listed
        - only gives information about matchers for courses that the user is
          a coordinator or mentor for
        - format: [int, int, ...]
    """
    user = request.user
    if not user.is_authenticated:
        raise PermissionDenied()

    courses = Course.objects.filter(
        # related to user
        (Q(mentor__user=user) | Q(coordinator__user=user))
        # active or not created yet
        & (Q(matcher__active=True) | Q(matcher__isnull=True))
    ).distinct()

    active_courses = []
    for course in courses:
        add_course = True
        is_coord = course.coordinator_set.filter(user=user).exists()
        is_mentor = course.mentor_set.filter(user=user).exists()
        if not is_coord and is_mentor:
            add_course = course.matcher.is_open if course.matcher else False

        if add_course:
            active_courses.append(course.id)

    return Response(active_courses)


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

        matcher_slots = MatcherSlot.objects.filter(matcher=matcher)
        serializer = MatcherSlotSerializer(matcher_slots, many=True)
        return Response({"slots": serializer.data}, status=status.HTTP_200_OK)
    if request.method == "POST":
        # update possible slots
        if not is_coordinator:
            raise PermissionDenied(
                "You must be a coordinator for the course to submit this form."
            )

        if matcher is None:
            # create matcher
            matcher = Matcher.objects.create(course=course)

        # Request data:
        # [{"times": [{"day": str, "startTime": str, "endTime": str}], "numMentors": int}]

        if "slots" in request.data:
            request_slots = request.data["slots"]
            request_times = [slot["times"] for slot in request_slots]
            # delete slots that are not in the request
            matcher_slots = MatcherSlot.objects.filter(matcher=matcher).exclude(
                times__in=request_times
            )

            num_deleted, _ = matcher_slots.delete()
            logger.info("<Matcher> Deleted %s slots.", num_deleted)

            for slot_json in request.data["slots"]:
                times = slot_json["times"]
                min_mentors = (
                    slot_json["minMentors"] if "minMentors" in slot_json else 0
                )
                max_mentors = (
                    slot_json["maxMentors"] if "maxMentors" in slot_json else 10
                )
                if min_mentors > max_mentors:
                    return Response(
                        {
                            "error": (
                                "min mentors is greater than max mentors for some slot"
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # update slot if it already exists with the same times
                slot = MatcherSlot.objects.filter(matcher=matcher, times=times).first()
                if slot is None:
                    slot = MatcherSlot.objects.create(
                        matcher=matcher,
                        times=times,
                        min_mentors=min_mentors,
                        max_mentors=max_mentors,
                    )
                else:
                    slot.min_mentors = min_mentors
                    slot.max_mentors = max_mentors
                    slot.save()

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
                "You must be a coordinator or mentor for the course to submit this"
                " form."
            )

        if matcher is None:
            # haven't set up the matcher yet
            return Response({"responses": []}, status=status.HTTP_200_OK)

        matcher_preferences = MatcherPreference.objects.filter(slot__matcher=matcher)
        if not is_coordinator and is_mentor:
            # filter only this mentor's preferences
            matcher_preferences = matcher_preferences.filter(mentor__user=request.user)
        serializer = MatcherPreferenceSerializer(matcher_preferences, many=True)
        return Response(
            {"responses": serializer.data, "open": matcher.is_open},
            status=status.HTTP_200_OK,
        )
    if request.method == "POST":
        # update mentor preferences
        if not is_mentor:
            raise PermissionDenied(
                "You must be a mentor for the course to submit this form."
            )

        if matcher is None or matcher.is_open is False:
            raise PermissionDenied("Form is not open for reponses.")

        mentor = Mentor.objects.get(
            user=request.user, course=course, section__isnull=True
        )

        if len([pref for pref in request.data if pref["preference"] > 0]) < 3:
            raise PermissionDenied("Less than 3 nonzero preferences provided.")

        for pref in request.data:
            curslot = MatcherSlot.objects.get(pk=pref["id"])
            existing_queryset = MatcherPreference.objects.filter(
                slot=curslot, mentor=mentor
            )
            if existing_queryset.exists():
                # unique constraint guarantees there will only be one
                existing = existing_queryset.get()
                # update existing preference
                existing.preference = pref["preference"]
                existing.save()
            else:
                # create new preference
                new_pref = MatcherPreference(
                    slot=curslot, mentor=mentor, preference=pref["preference"]
                )
                new_pref.save()
        logger.info(
            "<Matcher:Success> Updated mentor %s preferences for %s", mentor, course
        )
        return Response(status=status.HTTP_200_OK)
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
    if request.method == "POST":
        # add new mentors to course
        skipped = []
        # users already associated with the course as a mentor
        users_with_course = User.objects.filter(mentor__course=course)
        for email in set(request.data["mentors"]):
            if not email or "@" not in email:
                # invalid or blank email
                skipped.append(email)
            else:
                username = email.split("@")[0]  # username is everything before @
                # use existing user, or create a new user if it doesnt exist
                user, _ = User.objects.get_or_create(username=username, email=email)
                # if mentor exists, skip
                if user in users_with_course:
                    skipped.append(email)
                    continue
                # create new mentor
                Mentor.objects.create(user=user, course=course)
        return Response({"skipped": skipped}, status=status.HTTP_200_OK)
    if request.method == "DELETE":
        # delete mentors from course
        skipped = []
        for email in request.data["mentors"]:
            try:
                mentor = Mentor.objects.get(
                    course=course, user__email=email, section=None
                )
                mentor.delete()
            except Mentor.DoesNotExist:
                skipped.append(email)
        skipped_serializer = MentorSerializer(skipped, many=True)
        return Response({"skipped": skipped_serializer.data}, status=status.HTTP_200_OK)

    raise PermissionDenied()


@api_view(["GET", "POST"])
def configure(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/configure

    GET: Get the matcher configuration
        - coordinators only
        - returns all configuration options
        - return format:
            {
                "open": bool,
                "slots": [{"id": int, "minMentors": int, "maxMentors": int}, ...]
            }
    GET: Get the matcher configuration
        - mentors only
        - only returns configuration options relevant to the mentor:
            - whether the matcher is open
        - return format:
            { "open": bool }
    POST: Update the matcher configuration
        - coordinators only
        - open/close form:
            - format: {"open": bool}
        - update slot mentor count:
            - format: {"slots": [{"id": int, "minMentors": int, "maxMentors": int}, ...]}
        - run the matcher:
            - format: {"run": true}
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    matcher = course.matcher
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()

    if request.method == "GET":
        if is_coordinator:
            if matcher is None:
                # haven't set up the matcher yet
                return Response({"open": False, "slots": []}, status=status.HTTP_200_OK)

            matcher_slots = MatcherSlot.objects.filter(matcher=matcher)
            return Response(
                {
                    "open": matcher.is_open,
                    "slots": matcher_slots.values("id", "min_mentors", "max_mentors"),
                },
                status=status.HTTP_200_OK,
            )
        if matcher is None or matcher.is_open is False:
            return Response({"open": False}, status=status.HTTP_200_OK)
        return Response({"open": True}, status=status.HTTP_200_OK)
    if request.method == "POST":
        if not is_coordinator:
            raise PermissionDenied(
                "You must be a coordinator to modify the matcher configuration."
            )

        if matcher is None:
            # create matcher
            matcher = Matcher.objects.create(course=course)

        if "slots" in request.data:
            # update slot configuration
            with transaction.atomic():
                for slot in request.data.get("slots"):
                    curslot = MatcherSlot.objects.get(pk=slot["id"])
                    if "min_mentors" in slot:
                        curslot.min_mentors = slot["min_mentors"]
                    if "max_mentors" in slot:
                        curslot.max_mentors = slot["max_mentors"]
                    if curslot.min_mentors > curslot.max_mentors:
                        return Response(
                            {
                                "error": (
                                    "min mentors is greater than max mentors for some"
                                    " slot"
                                )
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    curslot.save()

        if "open" in request.data:
            matcher.is_open = request.data["open"]
            matcher.save()

        # run the matcher
        if "run" in request.data:
            try:
                matcher_assignment, unmatched = run_matcher(course)
            except Exception as e:  # pylint: disable=broad-except
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            # assignment is of the form {"mentor", "capacity"};
            # add a "section" key with default values of capacity and description
            updated_assignment = [
                {
                    "slot": int(slot),
                    "mentor": int(mentor),
                    "section": {"capacity": DEFAULT_CAPACITY, "description": ""},
                }
                for (mentor, slot) in matcher_assignment.items()
            ]
            # update the assignment
            matcher.assignment = updated_assignment
            matcher.save()

            return Response(
                {"assignment": matcher_assignment, "unmatched": unmatched},
                status=status.HTTP_200_OK,
            )

        return Response(status=status.HTTP_200_OK)

    raise PermissionDenied()


@api_view(["GET", "PUT"])
def assignment(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/assignment

    GET: Get the current assignment
        - coordinators only
        - return format: list of slot/mentor matching and list of unmatched mentor ids
            {
                "assignment": [
                    {"slot": int, "mentor": int,
                     "section": {"capacity": int, "description": str}},
                    ...
                ],
                "unmatched": [int, ...]
            }

    PUT: Update the current assignment
        - coordinators only
        - input format: list of slot/mentor/section matching
            {
                "assignment: [
                    {"slot": int, "mentor": int,
                     "section": {"capacity": int, "description": str}},
                    ...
                ]
            }
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    matcher = course.matcher
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    if not is_coordinator:
        raise PermissionDenied(
            "You must be a coordinator to view the matcher assignment."
        )

    if request.method == "GET":
        if matcher is None:
            # haven't set up the matcher yet
            return Response({"assignment": []}, status=status.HTTP_200_OK)

        # restructure assignments
        assignments = [
            {
                "slot": int(cur["slot"]),
                "mentor": int(cur["mentor"]),
                "section": cur["section"],
            }
            for cur in matcher.assignment
        ]
        return Response(
            {"assignment": assignments},
            status=status.HTTP_200_OK,
        )
    if request.method == "PUT":
        assignments = []
        for cur in request.data["assignment"]:
            if "slot" not in cur or "mentor" not in cur or "section" not in cur:
                return Response(
                    {"error": f"Invalid assignment {cur}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            assignments.append(
                {
                    "slot": cur["slot"],
                    "mentor": cur["mentor"],
                    "section": cur["section"],
                }
            )
        matcher.assignment = assignments
        matcher.save()
        return Response([], status=status.HTTP_202_ACCEPTED)

    return Response([], status=status.HTTP_200_OK)


def run_matcher(course: Course):
    """
    Run the matcher for the given course.
    Return format: tuple of (assignments, unmatched)
        - assignments: {mentor: slot, mentor: slot, ...}
        - unmatched: [int, int, ...] of mentor ids
    """
    # get slot information
    matcher_slots = MatcherSlot.objects.filter(matcher=course.matcher)
    # get preference information
    matcher_preferences = MatcherPreference.objects.filter(slot__matcher=course.matcher)

    # list of all mentor ids
    mentor_list = list(
        map(
            MentorTuple,
            list(set(matcher_preferences.values_list("mentor", flat=True))),
        )
    )

    # list of all slot ids
    slot_list = list(
        map(
            lambda slot: SlotTuple(slot.id, slot.min_mentors, slot.max_mentors),
            matcher_slots,
        )
    )

    # list of preferences (mentor_id, slot_id, preference)
    preference_list = list(
        map(
            lambda preference: PreferenceTuple(
                preference.mentor.id, preference.slot.id, preference.preference
            ),
            matcher_preferences,
        )
    )

    # run the matcher
    return get_matches(mentor_list, slot_list, preference_list)


@api_view(["POST"])
def create(request, pk=None):
    """
    Endpoint: /api/matcher/<course_pk>/create

    POST: Create sections for the given course from the assignments.
        - coordinators only
        - if the input does not match the current server status,
            return 400 Bad Request
        - input format: list of slot/mentor/section matching
            {
                "assignment: [
                    {"slot": int, "mentor": int,
                     "section": {"capacity": int, "description": str}},
                    ...
                ]
            }
    """
    course = get_object_or_error(Course.objects.all(), pk=pk)
    matcher = course.matcher
    is_coordinator = course.coordinator_set.filter(user=request.user).exists()
    if not is_coordinator:
        raise PermissionDenied(
            "You must be a coordinator to create sections from the matcher assignment."
        )

    if matcher is None:
        return Response(
            {"error": "Matcher has not been set up yet."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # compare local data to server data
    local_data = request.data["assignment"]
    server_data = matcher.assignment
    data_matches = True
    if len(local_data) != len(server_data):
        data_matches = False

    # sort by mentor id to avoid ordering issues;
    # there should only be one assignment per mentor
    local_data = sorted(local_data, key=lambda x: x["mentor"])
    server_data = sorted(server_data, key=lambda x: x["mentor"])

    for local, server in zip(local_data, server_data):
        for key in local:
            if local[key] != server[key]:
                data_matches = False
                break
        if not data_matches:
            break

    if not data_matches:
        return Response(
            {"error": "Input data does not match server data."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # create sections; atomic to create all sections at once
    with transaction.atomic():
        for cur in local_data:
            mentor = Mentor.objects.get(pk=cur["mentor"])
            # create section
            section = Section.objects.create(
                mentor=mentor,
                capacity=cur["section"]["capacity"],
                description=cur["section"]["description"],
            )
            # create spacetimes
            slot = MatcherSlot.objects.get(pk=cur["slot"])
            for time in slot.times:
                start = datetime.datetime.strptime(time["start_time"], TIME_FORMAT)
                end = datetime.datetime.strptime(time["end_time"], TIME_FORMAT)
                duration = end - start
                Spacetime.objects.create(
                    section=section,
                    duration=duration,
                    start_time=start,
                    day_of_week=time["day"],
                    location=DEFAULT_LOCATION,
                )
        # close the matcher after sections have been created
        matcher.active = False
        matcher.save()
    return Response(status=status.HTTP_201_CREATED)
