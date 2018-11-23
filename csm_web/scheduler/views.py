from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth import logout as auth_logout

from rest_framework import generics, permissions, viewsets
from rest_framework.decorators import api_view

from .models import Attendance, Course, Profile, Section, Spacetime, Override
from .serializers import (
    AttendanceSerializer,
    CourseSerializer,
    ProfileSerializer,
    SectionSerializer,
    SpacetimeSerializer,
    OverrideSerializer,
)
from .permissions import IsLeader, IsLeaderOrReadOnly


def login(request):
    return render(request, "scheduler/login.html")


def logout(request):
    auth_logout(request)
    return redirect(reverse("index"))


def index(request):
    return render(request, "scheduler/index.html", {"user": request.user})


# REST Framework API Views


class CourseList(generics.ListCreateAPIView):
    """
    Returns a list of all existing courses.
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)


class CourseDetail(generics.RetrieveUpdateDestroyAPIView):
    """
    Returns the courses object associated with the given primary key ID.
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)


class UserProfileList(generics.ListCreateAPIView):
    """
    Returns a list of profiles associated with the currently logged in user.
    """

    serializer_class = ProfileSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_queryset(self):
        return Profile.objects.filter(user=self.request.user)


# API Stubs


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
