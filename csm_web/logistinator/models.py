import datetime
from django.db import models
from django.conf import settings
from django.utils import timezone
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
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, null=True)

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
    start_datetime = models.DateTimeField(default=datetime.datetime.now, blank=True)
    end_datetime = models.DateTimeField(default=datetime.datetime.now, blank=True)

    def __str__(self):
        return f"{self.user_id}, {self.room_id}, {self.start_datetime}, {self.end_datetime}"

# Room Availability Model

class RoomAvailability(models.Model):

    DAYS = 365
    DAYS_PER_WEEK = 7
    HOURS_PER_DAY = 16
    INTERVALS_PER_HOUR = 4
    MINS_PER_INTERVAL = 60 // INTERVALS_PER_HOUR

    INTERVAL = datetime.timedelta(days = DAYS)
    START_TIME = datetime.time(7, tzinfo = timezone.get_current_timezone())
    END_TIME = datetime.time(23, tzinfo = timezone.get_current_timezone())
    START_DATE = datetime.date.today() + datetime.timedelta(days=1)
    DAYS = ['Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday']

    availability_bitstring = models.BinaryField()

    def set_availability():
        """Create Random bitstrings and use them as actual bitstrings."""
        pass


    def get_all_availabilities(self, interval):
        """
        Return a nested dictionary with the availabilities in the given
        time interval.
        Assume that the bitstring starts with the availabilities
        of the next week. Starting tomorrow and the next 365 days.
        {Week#: {Day(MTWTFSS): [[Time, T/F], [Time, T/F]....], ...}...}
        """
        days = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"]
        availailities = {}
        all_bitstrings = _get_all_availability()
        count = 0
        date = RoomAvailabilities.START_DATE
        week_num = 1
        availablities[week_num] = {}
        day = days[date.weekday()]
        day_bit = convert_bitstring_to_list(interval, all_bitstrings[count])
        availablities[week_num][day] = day_bit
        while count < len(all_bitstrings):
            if day == "Mon":
                week_num += 1
            count += 1
            date = date + datetime.timedelta(days = 1)
            day = days[date.weekday()]
            day_bit = convert_bitstring_to_list(interval, all_bitstrings[count])
            availablities[week_num][day] = day_bit
        return availabilities

    def _convert_bitstring_to_list(self, interval, bitstring,
        start_time = None,
        end_time = None):
        """Convert Bitstring into a list"""
        if (start_time == None):
            start_time = RoomAvailabilities.START_TIME
        if (end_time == None):
            end_time = RoomAvailabilities.END_TIME
        total_bits = RoomAvailabilities.HOURS_PER_DAY * RoomAvailabilities.INTERVALS_PER_HOUR
        num_bits = interval // RoomAvailabilities.MINS_PER_INTERVAL
        bit_val = 2 ** num_bits - 1
        bitstr = bitstring << 4 # Ignore 7 am - 8 am
        total_bits -= 4
        curr_time = RoomAvailabilities.START_TIME + datetime.timedelta(hours = 1)
        avail_times = []
        while bitstr > 0:
            if (rshift(bitstr, (total_bits - num_bits)) ^ bit_val == 0):
                avail_times.append([curr_time, True])
            else:
                avail_times.append([curr_time, False])
            bitstr = bitstr << num_bits
            mins_interval = interval % 60
            hours_interval = interval // 60
            curr_time = curr_time + datetime.timedelta(hours=hours, minutes = mins_interval)
            total_bits -= num_bits
        return avail_times

    def rshift(val, n):
        return val>>n if val >= 0 else (val+0x100000000)>>n


    def _get_all_availability(self):
        """
        Get the room availabilities for the entire year.
        List of 365 bitstrings??
        """
        availability_list = []
        for i in range(1, RoomAvailabilities.DAYS + 1):
            availability_list += [get_day_availability(i)]
        return availability_list


    def get_day_availability(self, day):
        """
        Get the availability for a day (#) as a bitstring.
        """
        assert 0 <= day <= RoomAvailabilities.DAYS
        intervals_per_day = Availability.INTERVALS_PER_HOUR * Availability.HOURS_PER_DAY
        one_day = 1 << intervals_per_day
        bit_skip = intervals_per_day * (365 - days - 1)
        return (self._bitstring_int >> bit_skip) % one_day

    def get_availability(self, day, start_time, end_time):
        """
        Get the availability as a tuple list of 1s and 0s between start_time and
        end_time for a given day
        """
        day_availability = self.get_day_availability(day)
        start_index = self._timepoint_to_day_index(start_time)
        end_index = self._timepoint_to_day_index(start_time)

        # Extract each bit separately from the bitstring and convert into list of bits
        availabilities = list(
            ((day_availability >> i) % 2) for i in range(start_index, end_index)
        )
        avail_bitstr = int(''.join(availability), 2).to_bytes((end_index - start_index) * 4, 'little')
        return avail_bitstr



    def get_availability_dt_interval(self, start_date, end_date, start_time,
        end_time, time_interval):
        """
            Get computed availabilities for dates within start_data and end_data,
            and times within start_time and end_time over the given time intervals.

            Assume we have collected all of the rooms data from the gcal.
            The data is still in the datetime object format.
        """
        availabilities = {}
        curr_day = start_date
        while curr_date <= end_date:
            day_bitstr = get_availability(curr_date, start_time, end_time)
            av_lst = _convert_bitstring_to_list(time_interval, day_bitstr, start_time, end_time)
            availabilites[curr_date] = av_list
            curr_date = curr_date + timedelta(day = 1)
        return availabilities


    def get_weekly_availability(start_week, end_week, start_time, end_time,
        time_interval, days, threshold = 0):
        """
        start_week: datetime object which is the Monday of the first week where
            we want availabilities.
        end_week: datetime object, which is the Friday of the last week where
            we want availabilities.
        start_time: e.g., 8AM (time object).
        end_time: e.g. 10PM (time object).
        days: list. e.g., [“Monday”, “Tuesday”, “Wednesday”]
        threshold: number of weeks that are allowed to be busy while we still
            consider the room to be free.
        """
        availability = {}
        # Initialize the availabilites dictionary with the available days
        current_wk = start_week
        # threshold = 0
        all_availabilities = get_all_availabilities(time_interval)

        for day in days:
            availability[day] = _get_all_availability_for_day(
            start_week, end_week, start_time, end_time, day, time_interval, threshold
            )
        return availability


    def _get_all_availability_for_day(start_week, end_week, start_time,
        end_time, day, interval, threshold = 0):
        """ day should be an int corresponding to the day of the week
        """

        current_wk = start_week
        week_num = _find_week_num(start_week)
        _first_wk = week_num
        day_availability = []
        all_availabilities = get_all_availabilities(time_interval)
        min_weeks = len(check_days) - threshold
        max_week = max(all_availabilities.keys())
        check_days = {}
        while current_wk < end_week:
            check_days[week_num] = all_availabilities[week_num][day]
            week_num += 1
            current_wk = current_wk + datetime.timedelta(days=7)

        for i in range(len(check_days.values()[0])):
            count = 0
            for wk in check_days.keys():
                time = wk[i]
                if wk[i] in check_days[wk]:
                    count += 1
            if count >= min_weeks:
                day_availability.append(time[i][0], True)
        return day_availability


    def _find_week_num(date):
        """Find the number of the week given the date. """
        current_day = RoomAvailabilities.START_DATE
        week_num = 1
        day = date.weekday()
        if current_day.weekday() > 1:
            next_monday = current_day + datetime.timedelta(days = current_day.weekday() - 1)
            week_num += 1
        elif current_day.weekday() < 1:
            next_monday = current_day + datetime.timedelta(days = 1)
            week_num += 1
        else:
            next_monday = current_day
        while date > next_monday:
            date = date + datetime.timedelta(days = 7)
            week_num += 1
        return week_num

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
            - 1
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

    @property
    def _bitstring_view(self):
        """
        Returns the bitstring of this Availability as a string of 1s and 0s
        """
        return bin(int.from_bytes(self.bitstring, Availability.BYTE_ORDER))[2:]
