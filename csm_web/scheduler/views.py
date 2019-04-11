from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import logout as auth_logout

from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from enum import Enum

from .models import (
    User,
    Attendance,
    Course,
    Profile,
    Section,
    Spacetime,
    Override,
    Flag,
    RoomAvailabilities,
)
from .serializers import (
    UserSerializer,
    AttendanceSerializer,
    CourseSerializer,
    ProfileSerializer,
    VerboseProfileSerializer,
    UserProfileSerializer,
    SectionSerializer,
    SpacetimeSerializer,
    OverrideSerializer,
    FlagSerializer,
    RoomAvailabilitiesSerializer,
)
from .permissions import (
    is_leader,
    IsLeader,
    IsLeaderOrReadOnly,
    IsReadIfOwner,
    IsOwner,
    DestroyIsOwner,
)

VERBOSE = "verbose"
USERINFO = "userinfo"


@api_view(http_method_names=["POST"])
def enroll(request, pk):
    section = get_object_or_404(Section, pk=pk)

    if request.user.profile_set.filter(course=section.course, active=True).count() > 0:
        # Note: This denies anyone who is already associated with a course
        # (student, JM, SM, Coord) from enrolling in a course section.
        raise PermissionDenied(
            detail={
                "short_code": "already_enrolled",
                "message": "User is already enrolled in this course",
            },
            code=status.HTTP_403_FORBIDDEN,
        )

    if (
        timezone.now() < section.course.enrollment_start
        or timezone.now() > section.course.enrollment_end
    ):
        raise PermissionDenied(
            detail={
                "short_code": "course_closed",
                "message": "Course is not open for enrollment",
            },
            code=status.HTTP_403_FORBIDDEN,
        )

    with transaction.atomic():
        # We reload the section object for atomicity. Even though we never actually
        # update the section, any profile addition must first acquire a lock on the
        # desired section. This allows us to assume that current_student_count is
        # correct.
        section = Section.objects.select_for_update().get(pk=section.pk)

        if section.current_student_count >= section.capacity:
            raise PermissionDenied(
                detail={
                    "short_code": "section_full",
                    "message": "Section is at full capacity",
                },
                code=status.HTTP_403_FORBIDDEN,
            )

        profile = Profile(
            course=section.course,
            section=section,
            user=request.user,
            role=Profile.STUDENT,
            leader=section.mentor,
        )
        profile.save()

    serialized_profile = ProfileSerializer(profile).data
    return Response(serialized_profile)


# REST Framework API Views


class CourseList(generics.ListAPIView):
    """
    Responds to GET /courses with a list of all existing courses.
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    list_permission_source = None


class CourseDetail(generics.RetrieveAPIView):
    """
    Responds to GET /courses/$NAME/ with the courses object associated with the given slug name.
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_object(self):
        return self.queryset.get(name__iexact=self.kwargs["name"])


class CourseSectionList(generics.ListAPIView):
    """
    Responds to GET /courses/$NAME/sections with a list of all sections associated with the course
    of the given slug name.
    """

    queryset = Course.objects.all()
    serializer_class = SectionSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    list_permission_source = None

    def get_queryset(self):
        return Section.objects.filter(course__name__iexact=self.kwargs["name"])


class UserProfileList(generics.ListAPIView):
    """
    Returns a list of profiles associated with the currently logged in user.
    """

    serializer_class = ProfileSerializer

    # There are no restrictions on any user viewing their own Profiles
    list_permission_source = None

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Profile.objects.filter(user=self.request.user, active=True)
        else:
            raise PermissionDenied


class UserProfileDetail(generics.RetrieveAPIView):
    """
    Returns details for the profile with profile_id = $ID, selectively gated by leadership,
    i.e. only the leader or user associated with the profile should be able to retrieve this.
    """

    queryset = Profile.objects.filter(active=True)
    permission_classes = (IsReadIfOwner | IsLeader,)

    def get_serializer_class(self):
        if self.request.query_params.get(VERBOSE, "false") == "true":
            return VerboseProfileSerializer
        elif self.request.query_params.get(USERINFO, "false") == "true":
            return UserProfileSerializer
        else:
            return ProfileSerializer


class DeleteProfile(generics.DestroyAPIView):
    # TODO this looks like it should really have a permission class...

    permission_classes = (DestroyIsOwner,)

    def destroy(self, request, *args, **kwargs):
        profile = get_object_or_404(Profile, pk=self.kwargs["pk"])
        self.check_object_permissions(request, profile)
        if not profile.active:
            raise PermissionDenied(
                "This profile ({}) has been deactivated".format(profile)
            )
        profile.active = False
        profile.save()

        return Response({}, status=status.HTTP_204_NO_CONTENT)


class UserProfileAttendance(generics.ListAPIView):
    """
    GET: Returns attendances for profile with profile_id = $ID, Gated by leadership
    """

    serializer_class = AttendanceSerializer
    permission_classes = ((IsOwner | IsLeader),)

    def get_queryset(self):
        profile = get_object_or_404(Profile, pk=self.kwargs["pk"])
        return Attendance.objects.filter(attendee=profile.pk)

    @property
    def list_permission_source(self):
        # Only the Owner or Leader of this Profile should be able to view its attendance
        return get_object_or_404(Profile, pk=self.kwargs["pk"])


class SectionDetail(generics.RetrieveAPIView):
    """
    Responds to GET /sections/$ID with the corresponding section.
    """

    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_object(self):
        return self.queryset.get(pk=self.kwargs["pk"])


class CreateOverrideDetail(generics.CreateAPIView):
    """
    Responds to POST /overrides with the corresponding section.
    """

    queryset = Override.objects.all()
    serializer_class = OverrideSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)


class OverrideDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Override.objects.all()
    serializer_class = OverrideSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_object(self):
        return self.queryset.get(pk=self.kwargs["pk"])


class CreateAttendanceDetail(generics.CreateAPIView):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeader)

    def perform_create(self, serializer):
        # Deny attendance creation if not leader of section
        section = serializer.validated_data["section"]
        profile = serializer.validated_data["attendee"]
        if not is_leader(self.request.user, section):
            raise PermissionDenied(
                "You are not allowed to create Attendances for that section"
            )
        elif not profile.active:  # Deny attendances for deactivated profiles
            raise PermissionDenied(
                "This profile ({}) has been deactivated".format(profile)
            )
        else:
            serializer.save()


class AttendanceDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeader)

    def get_object(self):
        return self.queryset.get(pk=self.kwargs["pk"])


class CreateFlag(generics.CreateAPIView):
    """Create Flag instance"""
    queryset = Flag.objects.all()
    serializer_class = FlagSerializer


class ToggleFlag(generics.CreateAPIView):
    queryset = Flag.objects.all()
    serializer_class = FlagSerializer

    @api_view(http_method_names=["POST"])
    def toggle_flag(self, pk):
        current_flag = get_object_or_404(Flag, pk=pk)
        current_flag.on = not current_flag.on
        current_flag.save()
        return Response(FlagSerializer(current_flag).data)

# Rooms Availabilities Model Methods
# class PotentialRooms(Enum):

class CreateRoomAvailability(generics.CreateAPIView):
    queryset = RoomAvailabilities.objects.all()
    serializer_class = RoomAvailabilitiesSerializer


def _bitstring_to_list(avail_bitstring):
    """Returns a list based on the availability_bitstring
    that includes all of the availablities for a specific day.
    Every bit has an element in the list
    [[8:00, True], [8:30, False]...]
    *** Function not in dropbox paper ***
    """
    pass

def _get_room_schedule():
    """Return a nested dictionary of the room schedule for the entire semester.
    {Week#: {Day(MTWTF): availability_bitstring}}
    *** Function not in dropbox paper ***
    """
    pass

def _is_available(time_bitstring, interval_bitstring):
    """Compare the bitstring. Return true if available, else False.
    **** Not in dropbox paper
    """
    if (time_bitstring & interval_bitstring) == '1111':
        return True
    else:
        return False

def _calculate_day_availabilities(avail_bitstring, interval_bitstring):
    """Returns a list of [Time, True/False] values based on the availabilities.
    *** Not in dropbox paper ***
    """
    availablities = []
    # availablities_lst = bitstring_to_list(avail_bitstring)
    time_index = 0
    shift = 48 #Assuming time interval only has 4 bits
    while shift > 0:
        check_timeslot = avail_bitstring >> shift
        if _is_available(check_timeslot, interval_bitstring):
            availabilities += [general_time_intervals[time_index], True]
        else:
            availabilities += [general_time_intervals[time_index], False]
        time_index += 4 #Assuming that for one hour there are 4 intervals
        shift -= 4
    return availabilities

def get_all_availabilities(time_interval):
    """Return a nested dictionary with the availabilities in the given time interval.
    {Week#: {Day(MTWTF): [[Time, T/F], [Time, T/F]....], ...}...}
    """
    schedule = get_room_schedule()
    time_bitstring = '1111'
    # Assume time_interval = 60 minutes
    for week in schedule:
        for day in week:
            bitstring = week[day]
            week[day] = _calculate_day_availabilities(bitstring, time_bitstring)
    return schedule

def get_availability_dt_interval(start_data, end_date, start_time, end_time, time_interval):
    """Get computed availabilities for dates within start_data and end_data,
    and times within start_time and end_time over the given time intervals.

    Assume we have collected all of the rooms data from the gcal.
    The data is still in the datetime object format. It is a dictionary
    """
    computed_avail = {}
    num_days = (end_date - start_date).days
    for i in range(num_days + 1):
        today = start_date + timedelta(i)
        computed_avail[today] = []
        ### Find all availabilites for that day
        ### Then, filter available times within the given parameters

    return computed_avail




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
    availability['timedelta'] = time_interval
    availability['busy_weeks'] = []
    availability['Availabilities'] = {}
    # Initialize the availabilites dictionary with the available days
    for day in days:
        availability['Availabilities'][day] = []
    current_wk = start_week
    # threshold = 0
    all_availabilities = get_all_availabilities(time_interval)
    check_time = 7# Pick a time in available time. (day and time)
    while threshold >= 0 and current_wk < end_week:

         # Check if that time is available for all weeks






####


# API Stubs


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer


class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer


class SpacetimeViewSet(viewsets.ModelViewSet):
    queryset = Spacetime.objects.all()
    serializer_class = SpacetimeSerializer


class OverrideViewSet(viewsets.ModelViewSet):
    queryset = Override.objects.all()
    serializer_class = OverrideSerializer
