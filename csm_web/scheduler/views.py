from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.contrib.auth import logout as auth_logout
from django.core.exceptions import PermissionDenied

from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import api_view

from .models import User, Attendance, Course, Profile, Section, Spacetime, Override
from .serializers import (
    UserSerializer,
    AttendanceSerializer,
    CourseSerializer,
    ProfileSerializer,
    SectionSerializer,
    SpacetimeSerializer,
    OverrideSerializer,
)
from .permissions import is_leader, IsLeader, IsLeaderOrReadOnly, IsReadIfOwner, IsOwner


def login(request):
    return render(request, "scheduler/login.html")


def logout(request):
    auth_logout(request)
    return redirect(reverse("index"))


def index(request):
    data = {"user": request.user}

    if request.user.is_authenticated:
        data["profiles"] = Profile.objects.filter(user=request.user)

    return render(request, "scheduler/index.html", data)


def enroll(request, pk):
    section = get_object_or_404(Section, pk=pk)
    if section.current_student_count >= section.capacity:
        raise PermissionDenied

    profile = Profile(
        course=section.course,
        section=section,
        user=request.user,
        role=Profile.STUDENT,
        leader=section.mentor,
    )
    profile.save()
    return redirect(reverse("index"))


# REST Framework API Views


class CourseList(generics.ListAPIView):
    """
    Responds to GET /courses with a list of all existing courses.
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)


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
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_queryset(self):
        return Section.objects.filter(course__name__iexact=self.kwargs["name"])


class UserProfileList(generics.ListAPIView):
    """
    Returns a list of profiles associated with the currently logged in user.
    """

    serializer_class = ProfileSerializer
    permission_classes = (IsReadIfOwner,)

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)


class UserProfileDetail(generics.RetrieveAPIView):
    """
    Returns details for the profile with profile_id = $ID, selectively gated by leadership,
    i.e. only the leader or user associated with the profile should be able to retrieve this.
    """

    queryset = Profile.objects.all()
    serializer_class = ProfileSerializer
    permission_classes = (IsReadIfOwner | IsLeader,)
    # TODO account for verbosity (details in dropbox paper spec)


class UserProfileAttendance(generics.ListCreateAPIView):
    """
    GET: Returns attendances for profile with profile_id = $ID, Gated by leadership
    POST: Updates an attendance record for the user with profile_id = $ID
    """

    serializer_class = AttendanceSerializer
    permission_classes = (IsOwner, IsLeader)

    def get_queryset(self):
        return Attendance.objects.filter(section__mentor__pk=self.kwargs["pk"])


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
        if not is_leader(self.request.user, section):
            raise PermissionDenied(
                "You are not allowed to create Attendances for that section"
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
