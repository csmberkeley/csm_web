"""scheduler URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

from rest_framework.urlpatterns import format_suffix_patterns
from rest_framework.routers import DefaultRouter

from . import views

urlpatterns = []

rest_urlpatterns = [
    path("courses/", views.CourseList.as_view(), name="list-course"),
    path("courses/<slug:name>/", views.CourseDetail.as_view(), name="view-course"),
    path(
        "courses/<slug:name>/sections/",
        views.CourseSectionList.as_view(),
        name="list-course-section",
    ),
    path("profiles/", views.UserProfileList.as_view(), name="list-profile"),
    path("profiles/<int:pk>/", views.UserProfileDetail.as_view(), name="view-profile"),
    path(
        "profiles/<int:pk>/attendance",
        views.UserProfileAttendance.as_view(),
        name="view-attendance",
    ),
    path("profiles/<int:pk>/unenroll", views.DeleteProfile.as_view(), name="unenroll"),
    path("sections/<int:pk>/enroll", views.enroll, name="enroll"),
    path("sections/<int:pk>/", views.SectionDetail.as_view(), name="view-section"),
    path("overrides/", views.CreateOverrideDetail.as_view(), name="create-override"),
    path("overrides/<int:pk>/", views.OverrideDetail.as_view(), name="view-override"),
    path(
        "attendances/", views.CreateAttendanceDetail.as_view(), name="create-attendance"
    ),
    path(
        "attendances/<int:pk>/",
        views.AttendanceDetail.as_view(),
        name="update-attendance",
    ),
    # all endpoints listed here https://paper.dropbox.com/doc/Scheduler-2.0-K0ZNsLU5DZ7JjGudjqKIt
]

urlpatterns.extend(format_suffix_patterns(rest_urlpatterns))
