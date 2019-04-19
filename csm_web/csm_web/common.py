from __future__ import print_function
import csv
import datetime
import pytz
import copy
import argparse
import dateutil.parser
import pickle

from gcal_reader import gcal_api_authenticate


# If modifying these scopes, delete the file token.json.
SCOPES = "https://www.googleapis.com/auth/calendar"
TIMEZONE = "America/Los_Angeles"
CALENDAR_ID = "primary"

# File paths
CREATED_PATH = "created_events.csv"
EVENTS_PATH = "gcal_events.csv"


def get_all_rooms_data(room_metadata, beginning, ending):
    temp_dict = {}
    for i in room_metadata.keys():
        if not i == "service":
            temp_dict[i] = room_metadata[i]

    return {
        k: get_room_data(v, beginning, ending, room_metadata)
        for k, v in temp_dict.items()
    }


def get_room_data(room_email, beginning, ending, room_metadata):
    """Takes in the email of the calendar for a room,
    a start and end tz aware datetime object.

    Returns a list of tuples of the form
    (start, end), where start and end are timezone aware
    datetime objects. This represents the event slots
    created on the room."""
    beginning = beginning.isoformat()
    ending = ending.isoformat()
    events_result = (
        room_metadata["service"]
        .events()
        .list(
            calendarId=room_email,
            timeMin=beginning,
            timeMax=ending,
            singleEvents=True,
            orderBy="startTime",
        )
        .execute()
    )

    event_slots = []

    for item in events_result["items"]:
        if "dateTime" not in item["start"]:
            # Full day events.

            start = item["start"]["date"] + " 00:01"  # Start at the top of the day
            end = item["end"]["date"] + " 23:59"  # End at 23:59.s
            date_format = "%m/%d/%y %H:%M"
            tz = pytz.timezone(TIMEZONE)

            # Convert to datetime objects from ISO strings.
            start = dateutil.parser.parse(start)
            end = dateutil.parser.parse(end)

            # Attach timezone information
            start = tz.localize(start)
            end = tz.localize(end)
        else:
            start = item["start"]["dateTime"]
            end = item["end"]["dateTime"]

            # Convert ISO Strings to datetime objects.
            start = dateutil.parser.parse(start)
            end = dateutil.parser.parse(end)

        # Takes in the start and end times returned, and converts them
        # to the required timezone.
        # Note that the API returns timezone aware datetime information
        # anyway, but this is merely a safety precaution.
        tz = pytz.timezone(TIMEZONE)
        start = start.astimezone(tz)
        end = end.astimezone(tz)

        event_slots.append((start, end))

    return event_slots


def get_rooms(path):
    """Takes in a path to the room metadata CSV.

    Returns a dictionary mapping room string IDs to their
    corresponding resource.google.com email IDs."""
    rooms = {}  # Map from room name to email ID.
    with open(path, "r", encoding="utf-8-sig") as csvfile:
        reader = csv.reader(csvfile)

        for row in reader:
            title, email = row
            assert title not in rooms, f"{title} has multiple emails"
            rooms[title] = email
            rooms["service"] = gcal_api_authenticate()
    return rooms


def binsearch_larger(arr, item):
    """
    Find the index of the first item in arr
    that is larger than or equal to the provided item.

    Adapted from https://stackoverflow.com/questions/6553970/find-the-first-element-in-a-sorted-array-that-is-greater-than-the-target
    """
    low = 0
    high = len(arr)

    while low != high:
        mid = (low + high) // 2
        if arr[mid] <= item:
            """This index, and everything below it, must not be the first element
             * greater than what we're looking for because this element is no greater
             * than the element.
            """
            low = mid + 1
        else:
            """This element is at least as large as the element, so anything after it    can't
             * be the first element that's at least as large.
             """
            high = mid

    """Now, low and high both point to the element in question."""
    return low


def _is_room_free(start, end, room_data):
    """Takes in start and end tz aware objects.
    Also takes in the room_data, as returned by
    get_room_data.

    Returns whether the room is free without any API calls.
    """

    # Sort by start of events.
    room_data = sorted(room_data, key=lambda x: x[0])

    start_times = [x[0] for x in room_data]

    slot_idx = binsearch_larger(start_times, end)
    if slot_idx == len(room_data):
        """There are no events that start after the
        requested end time.

        As long as the last event ends before
        the 'start' time, the room is free."""

        last_event = room_data[-1]
        return last_event[1] <= start
    elif slot_idx == 0:
        """The first event that starts after my
        end time is the very first event in the list.

        As long as the first event starts after
        the 'end' time, the room is free."""
        first_event = room_data[0]
        return first_event[0] >= end
    else:
        """
        We need to use 2 slots (i.e., booked events
        on the room calendar). second_slot is the
        event which is the 'next' event after
        the provided 'end' time. first_slot is the
        event immediately preceeding second_slot.

        As long as first_slot ends before 'start'
        and second_end starts after 'end', the room
        is free.
        """
        second_slot = room_data[slot_idx]
        first_slot = room_data[slot_idx - 1]
        return first_slot[1] <= start and second_slot[0] >= end


def is_room_free(room_email, start, end, room_data=None):
    """Takes in the ID (email) of a particular room,
    timezone aware start and end datetime objects,
    and the google calendar API service object.

    Optionally, takes in room_data in the form returned by
    get_room_data. If this is provided, does NOT make any
    API calls and instead does a linear search on the
    provided list of (start,end) tuples to check
    whether or not the slot is free.

    Makes an API call to check if the room is available to
    be booked during the slot provided.

    Returns true if it is, and false otherwise."""
    if room_data:
        # Use the downloaded data version of this function
        return _is_room_free(start, end, room_data)

    timeMin = start.isoformat()
    timeMax = end.isoformat()

    # Start and End are already time zone aware
    # However, a timezone must be provided to ensure that the
    # result is directly translated too.
    timeZone = TIMEZONE
    items = [{"id": room_email}]

    freebusy_query = {
        "timeMin": timeMin,
        "timeMax": timeMax,
        "timeZone": timeZone,
        "items": items,
    }

    result = room_data["service"].freebusy().query(body=freebusy_query).execute()
    booked_events = result["calendars"][room_email]["busy"]
    return len(booked_events) == 0  # There are no booked events at this time.
