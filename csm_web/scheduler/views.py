from django.db import transaction
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.contrib.auth import logout as auth_logout

from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import User, Attendance, Course, Profile, Section, Spacetime, Override
from .serializers import (
    UserSerializer,
    AttendanceSerializer,
    CourseSerializer,
    ProfileSerializer,
    VerboseProfileSerializer,
    SectionSerializer,
    SpacetimeSerializer,
    OverrideSerializer,
)
from .permissions import is_leader, IsLeader, IsLeaderOrReadOnly, IsReadIfOwner, IsOwner

VERBOSE = "verbose"


def login(request):
    return render(request, "scheduler/login.html")


def logout(request):
    auth_logout(request)
    return redirect(reverse("index"))


def index(request):
    data = {"user": request.user}

    if request.user.is_authenticated:
        data["profiles"] = Profile.objects.filter(user=request.user, active=True)

    return render(request, "scheduler/index.html", data)


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
        else:
            return ProfileSerializer


class DeleteProfile(generics.DestroyAPIView):
    # TODO this looks like it should really have a permission class...
    def destroy(self, request, *args, **kwargs):
        profile = get_object_or_404(Profile, pk=self.kwargs["pk"])
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
