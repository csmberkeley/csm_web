from __future__ import print_function
import csv
import datetime
from googleapiclient.discovery import build
from httplib2 import Http
from oauth2client import file, client, tools
import pytz
import copy
import argparse
from multiprocessing import Pool
import time
import calendar

from common import get_rooms, is_room_free, TIMEZONE, get_room_data, get_all_rooms_data

from gcal_reader import gcal_api_authenticate


ROOMS_PATH = "rooms.csv"
START_DATE = "01/01/19"  # Scout rooms after this date.
START_TIME = "08:00"  # Scout rooms after this time.
END_DATE = "12/31/19"  # Scout rooms before this date
END_TIME = "20:00"
START_TIME_INT = 8


def main():
    """
    Gets room availabilities in the following format:
        {'Cory-540': {[(dstart, dend): True],[(dstart, dend:) False],[]}}
        dstart - datetime object of start
        dend - datetime object of end
    """

    room_metadata = get_rooms(ROOMS_PATH)

    # SET THE FOLLOWING VARIABLES
    # Initial datetime object
    init_date, end_date = tz_localize(START_DATE, START_TIME, END_DATE, END_TIME)
    # Load all events for all rooms.
    all_room_data = get_all_rooms_data(room_metadata, init_date, end_date)
    # all the 15 minute intervals between the start and end date
    dts = [
        dt.strftime("%Y-%m-%d T%H:%M Z")
        for dt in datetime_range(init_date, end_date, timedelta(minutes=15))
    ]
    # availabilities for each room in 15 minute intervals
    room_availabilities = {}
    # Iterate through all rooms and get each room's availabilities
    for room_name, room_email in room_metadata.items():
        one_room_availability = {}
        for start_time in dts:
            # gets 15 minutes after the start_time we are checking
            end_time = start_time + datetime.timedelta(minutes=15)
            free_or_not = is_room_free(room_email, start_time, end_time, all_room_data)
            one_room_availability[(start_time, end_time)] = free_or_not
    room_availabilities[room_name] = one_room_availability
    return room_availabilities


def tz_localize(START_DATE, START_TIME, END_DATE, END_TIME):
    start_datetime = f"{START_DATE} {START_TIME}"
    end_datetime = f"{END_DATE} {END_TIME}"
    date_format = "%m/%d/%y %H:%M"
    tz = pytz.timezone(TIMEZONE)
    start_date = tz.localize(datetime.datetime.strptime(start_datetime, date_format))
    end_date = tz.localize(datetime.datetime.strptime(end_datetime, date_format))
    return start_date, end_date


if __name__ == "__main__":
    room_availabilities = main()
