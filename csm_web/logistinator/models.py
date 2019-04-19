import datetime
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import datetime
from django.conf import settings
from scheduler.models import ActivatableModel


class Availability(models.Model):
    """
    Byte order is little endian, but the days are big endian.

    000 ... 111
    MON ... SUN

    Within a day, it is also little endian

    8AM 9AM ... 12AM
    000 111 ... 111
    """

    BYTE_ORDER = "little"

    DAYS = 7
    HOURS_PER_DAY = 16
    INTERVALS_PER_HOUR = 4
    MINS_PER_INTERVAL = 60 // INTERVALS_PER_HOUR

    INTERVAL = datetime.timedelta(minutes=MINS_PER_INTERVAL)
    START_TIME = datetime.time(7, tzinfo=timezone.get_current_timezone())  # 7AM
    END_TIME = datetime.time(23, tzinfo=timezone.get_current_timezone())  # 11PM

    INTERVAL_COUNT = INTERVALS_PER_HOUR * HOURS_PER_DAY * DAYS

    # By default, all slots are unavailable
    bitstring = models.BinaryField(default=0)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def _set_availability(self, day, start_time, end_time, is_available):

        start_index = self._timepoint_to_day_index(start_time)
        end_index = self._timepoint_to_day_index(end_time)
        intervals_per_day = Availability.INTERVALS_PER_HOUR * Availability.HOURS_PER_DAY
        bit_skip = intervals_per_day * (7 - day)

        s = int.from_bytes(self.bitstring, Availability.BYTE_ORDER)

        for i in range(start_index, end_index):
            bit_mask = 1 << (bit_skip - i - 1)

            if is_available:
                s = s | bit_mask
            else:
                s = s & ~bit_mask

        self.bitstring = s.to_bytes(56, Availability.BYTE_ORDER)
        # messy workaround to get it to save as a binary string without leading '0b'

    def get_weekly_availability(self, start_time, end_time, interval):
        """
        Was get_availability in the spec
        Get the availability between start_time and end_time for all days of the week
        represented as a dictionary indexed by days, containing lists of booleans

        {
        timedelta: 1 hour
        availabilities: {

          Monday: [[8:00, True], [9:00, False], [10:00, False]]
          Tuesday: [[8:00, True], [9:00, False], [10:00, False]]
          …

        }
        }
        """
        num_intervals = (interval.seconds // 60) // 15
        availabilities_obj = {}
        for i in range(Availability.DAYS):
            day_list = []
            day_available = self.get_availability(i, start_time, end_time)
            idx = 0
            new_start = datetime.datetime(1, 1, 1, start_time.hour, start_time.minute)
            for j in range(len(day_available) // num_intervals):
                is_available = True
                for k in range(num_intervals):
                    is_available = is_available and day_available[idx]
                    idx += 1
                start_time_string = str(new_start.hour) + ":" + str(new_start.minute)
                day_list.append([start_time_string, is_available])
                new_start += interval
            availabilities_obj[i] = day_list

        return availabilities_obj

    def get_availability(self, day, start_time, end_time):
        """
        Get the availability as a tuple list of 1s and 0s between start_time and
        end_time for a given day
        """
        day_availability = self.get_day_availability(day)
        start_index = self._timepoint_to_day_index(start_time)
        end_index = self._timepoint_to_day_index(end_time)

        # Extract each bit separately from the bitstring and convert into list of bits
        availabilities = tuple(
            ((day_availability >> (64 - i - 1)) % 2)
            for i in range(start_index, end_index)
        )
        return availabilities

    def get_day_availability(self, day):
        """
        Get the availability for a day as a bitstring
        """
        assert 0 <= day < Availability.DAYS
        intervals_per_day = Availability.INTERVALS_PER_HOUR * Availability.HOURS_PER_DAY

        # This is the bitmask for one day
        one_day = 1 << intervals_per_day

        # The number of bits to skip one day for a little endian day system
        bit_skip = intervals_per_day * (7 - day - 1)

        return (self._bitstring_int >> bit_skip) % one_day

    def _valid_timepoint(self, timepoint):
        """
        Check that a given timepoint is valid. A timepoint is a datetime.time object
        with an hour and a minute set. A valid timepoint is one which represents an
        interval, e.g. time(9, 15) represents the 15 minute interval starting at 9AM
        and is valid. time(9, 16) is invalid because it is within an interval and
        doesn't represent the start of an interval.
        """
        # Check that it is exactly at an interval time
        on_interval = timepoint.minute % Availability.MINS_PER_INTERVAL == 0

        if not on_interval:
            return False

        # Check that it is after the start time
        after_start = timepoint >= Availability.START_TIME

        # Check that it is after the end time, acccounting for end times that cross the
        # midnight point
        true_end_hour = self._cross_day_aware_hour(Availability.END_TIME)

        # If the hours match, check that it is before the last possible interval
        before_end = (timepoint.hour < true_end_hour) or (
            timepoint.hour == true_end_hour
            and timepoint.minute
            < (Availability.END_TIME.minute - Availability.MINS_PER_INTERVAL)
        )

        return after_start and before_end

    def _timepoint_to_day_index(self, timepoint):
        """
        Compute the index in a day bitstring for a given timepoint
        """
        assert self._valid_timepoint(timepoint)
        hour_delta = (
            self._cross_day_aware_hour(timepoint) - Availability.START_TIME.hour
        )
        minute_delta = timepoint.minute - Availability.START_TIME.minute

        return (
            hour_delta * Availability.INTERVALS_PER_HOUR
            + minute_delta // Availability.MINS_PER_INTERVAL
        )

    def _cross_day_aware_hour(self, timepoint):
        """
        Returns the hour of a timepoint, accounting for the possibility that the
        timepoint is after midnight
        """
        if timepoint.hour >= Availability.START_TIME.hour:
            return timepoint.hour
        else:  # this time range crosses midnight
            return timepoint.hour + 24

    @property
    def _bitstring_int(self):
        """
        Returns the bitstring of this Availability as an integer number
        """
        return int.from_bytes(self.bitstring, Availability.BYTE_ORDER)


class Matching(ActivatableModel):
    user_id = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    room_id = models.CharField(max_length=16)
    start_datetime = models.DateField()
    end_datetime = models.DateField()
    weekly = models.BooleanField(default=True)

    def __str__(self):
        return "({person}, {room}, {start}, {end}, {weekly})".format(
            person=self.user_id,
            room=self.room_id,
            start=self.start_datetime,
            end=self.end_datetime,
            weekly="Yes" if self.weekly else "No",
        )

    @property
    def _bitstring_view(self):
        """
        Returns the bitstring of this Availability as a string of 1s and 0s
        """
        return bin(int.from_bytes(self.bitstring, Availability.BYTE_ORDER))[2:]


class ImposedEvent(models.Model):
    active = models.BooleanField()

class Conflict(ActivatableModel):

    user_id = models.CharField(max_length=100)
    room_id = models.CharField(max_length=16)
    start_datetime = models.DateTimeField(default=datetime.now, blank=True)
    end_datetime = models.DateTimeField(default=datetime.now, blank=True)

    def __str__(self):
        return f"{self.user_id}, {self.room_id}, {self.start_datetime}, {self.end_datetime}"
