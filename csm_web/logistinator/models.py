import datetime
from django.db import models
from django.conf import settings
from django.utils import timezone

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

    # By default, all slots are available
    default_bitstring = (1 << INTERVAL_COUNT) - 1
    # .to_bytes(INTERVAL_COUNT // 8, BYTE_ORDER)
    default_bitstring &= 1 << 10
    default_bitstring = default_bitstring.to_bytes(INTERVAL_COUNT // 8, BYTE_ORDER)
    bitstring = models.BinaryField(default=default_bitstring)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)

    def get_availability(self, day, start_time, end_time):
        day_availability = self.get_day_availability(day)
        start_index = self._timepoint_to_day_index(start_time)
        end_index = self._timepoint_to_day_index(start_time)

        availabilities = tuple(
            ((day_availability >> i) % 2) for i in range(start_index, end_index)
        )
        return availabilities

    def get_day_availability(self, day):
        assert 0 <= day < Availability.DAYS
        intervals_per_day = Availability.INTERVALS_PER_HOUR * Availability.HOURS_PER_DAY
        one_day = 1 << intervals_per_day

        # The number of bits to skip for a little endian day system
        bit_skip = intervals_per_day * (7 - day - 1)
        return (self._bitstring >> bit_skip) % one_day

    def _valid_timepoint(self, timepoint):
        on_interval = timepoint.minute % Availability.MINS_PER_INTERVAL == 0

        if not on_interval:
            return False

        after_start = timepoint >= Availability.START_TIME

        true_end_hour = self._cross_day_aware_hour(Availability.END_TIME)

        before_end = (timepoint.hour < true_end_hour) or (
            timepoint.hour == true_end_hour
            and timepoint.minute
            < (Availability.END_TIME.minute - Availability.MINS_PER_INTERVAL)
        )

        return after_start and before_end

    def _timepoint_to_day_index(self, timepoint):
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
        if timepoint.hour >= Availability.START_TIME.hour:
            return timepoint.hour
        else:  # this time range crosses midnight
            return timepoint.hour + 24

    @property
    def _bitstring(self):
        return int.from_bytes(self.bitstring, Availability.BYTE_ORDER)
=======
# Create your models here.


class ActivatableModel(models.Model):
    active = models.BooleanField(default=True)

    class Meta:
        abstract = True


class Matching(ActivatableModel):
    ROOM_CHOICES = (
        ("Cory-144MB", "Cory-144MB"),
        ("Cory-258", "Cory-258"),
        ("Cory-258", "Cory-258"),
        ("Cory-400", "Cory-400"),
        ("Cory-504", "Cory-504"),
        ("Cory-521", "Cory-521"),
        ("Cory-531", "Cory-531"),
        ("Cory-540AB", "Cory-540AB"),
        ("Cory-557", "Cory-557"),
        ("Cory-Classroom-293", "Cory-Classroom-293"),
        ("Cory-Classroom-299", "Cory-Classroom-299"),
        ("Soda-306", "Soda-306"),
        ("Soda-310", "Soda-310"),
        ("Soda-320", "Soda-320"),
        ("Soda-373", "Soda-373"),
        ("Soda-380", "Soda-380"),
        ("Soda-405", "Soda-405"),
        ("Soda-430-438", "Soda-430-438"),
        ("Soda-511", "Soda-511"),
        ("Soda-606", "Soda-606"),
        ("Soda-Alcove-283E", "Soda-Alcove-283E"),
        ("Soda-Alcove-283H", "Soda-Alcove-283H"),
        ("Soda-Alcove-341A", "Soda-Alcove-341A"),
        ("Soda-Alcove-341B", "Soda-Alcove-341B"),
        ("Soda-Alcove-411", "Soda-Alcove-411"),
        ("Soda-Alcove-611", "Soda-Alcove-611"),
        ("Dummy", "Dummy"),
    )

    user_id = models.CharField(max_length=100)
    room_id = models.CharField(max_length=16, choices=ROOM_CHOICES, blank=True)
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
