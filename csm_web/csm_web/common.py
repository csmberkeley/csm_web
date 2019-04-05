from __future__ import print_function
import csv
import datetime
from googleapiclient.discovery import build
from httplib2 import Http
from oauth2client import file, client, tools
import pytz
import copy
import argparse
import pprint
import dateutil.parser
import pickle


# If modifying these scopes, delete the file token.json.
SCOPES = "https://www.googleapis.com/auth/calendar"
TIMEZONE = "America/Los_Angeles"
CALENDAR_ID = "primary"

# File paths
CREATED_PATH = "created_events.csv"
CONFLICTS_PATH = "conflicts.csv"
EVENTS_PATH = "gcal_events.csv"


def get_room_conflicts(room_email, start, end, service, occurrences, room_data=None):
    """Takes in the same arguments as is_room_free, and additionally,
    the number of occurrences of the event.

    Optionally takes in room_data, as returned by get_room_data. If this is
    used, no API calls will be made, and instead is_room_free will return
    using the provided room_data.

    Iterates through the weeks (till the number of occurrences), and
    checks whether the provided room is free or not.

    Returns a list of week-indices (starting at 0), at which the room
    is busy. If the room is always free, returns an empty list.
    """
    busy_indices = []
    for i in range(occurrences):
        _start = start + datetime.timedelta(weeks=i)
        _end = end + datetime.timedelta(weeks=i)

        if not is_room_free(room_email, _start, _end, service, room_data):
            busy_indices.append(i)

    return busy_indices


def get_all_rooms_data(room_metadata, beginning, ending, service, use_cache):
    return {
        k: get_room_data(v, beginning, ending, service, use_cache)
        for k, v in room_metadata.items()
    }


def write_rows(csvfile_path, rows):
    with open(csvfile_path, "w") as csvfile:
        writer = csv.writer(csvfile)
        for row in rows:
            writer.writerow(row)


def get_room_data(room_email, beginning, ending, service, use_cache=False):
    """Takes in the email of the calendar for a room,
    a start and end tz aware datetime object.

    Optionally, takes in use_cache. If this is true, it
    loads from the cached result. Please note that
    this completely ignores the beginning and ending, so
    make sure to make a first call to this using use_cache
    being False.

    Returns a list of tuples of the form
    (start, end), where start and end are timezone aware
    datetime objects. This represents the event slots
    created on the room."""

    if use_cache:
        # Load from cache.
        with open("cache/" + room_email + ".pickle", "rb") as f:
            return pickle.load(f)

    beginning = beginning.isoformat()
    ending = ending.isoformat()
    events_result = (
        service.events()
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

    # Always add to cache if this method is called with use_cache=False
    with open("cache/" + room_email + ".pickle", "wb") as f:
        pickle.dump(event_slots, f)

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
    return rooms


def gcal_api_authenticate():
    """Google Calendar Authentication. Returns the service object to be used
    for making calls to the api."""
    # token.json stores the user's access and refresh tokens. It is created
    # automatically when the authorization flow completes for the first time.

    store = file.Storage("token.json")
    creds = store.get()
    if not creds or creds.invalid:
        flow = client.flow_from_clientsecrets("secrets/credentials.json", SCOPES)
        creds = tools.run_flow(flow, store)
    service = build("calendar", "v3", http=creds.authorize(Http()))
    return service


def book_event(event, service):
    """Takes in an event object as per the specification of Google Calendar's API,
    and books it."""
    event = service.events().insert(calendarId=CALENDAR_ID, body=event).execute()
    storage_data = {"Timestamp": datetime.datetime.now(), "EventID": event["id"]}
    return storage_data


def delete_event(eventid, service):
    """Deletes a provided event, given its eventid.

    Exceptions occur when trying to delete an event which does not exist. We do not care for this.
    """
    try:
        event = (
            service.events().delete(calendarId=CALENDAR_ID, eventId=eventid).execute()
        )
    except:
        pass


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


def is_room_free(room_email, start, end, service, room_data=None):
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

    result = service.freebusy().query(body=freebusy_query).execute()
    booked_events = result["calendars"][room_email]["busy"]
    return len(booked_events) == 0  # There are no booked events at this time.


def append_to_csv(row, path):
    """Takes in a row, and appends it to the provided
    csv file.
    """
    with open(path, "a") as csvfile:
        fieldnames = row.keys()
        writer = csv.DictWriter(csvfile, fieldnames)
        writer.writerow(row)


def create_empty_file(path):
    """Creates an empty file."""
    with open(path, "w+") as f:
        pass
