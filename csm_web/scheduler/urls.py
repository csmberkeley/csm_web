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

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login, name="login"),
    path("logout", views.logout, name="logout"),
]

rest_urlpatterns = [
    path("courses", views.CourseList.as_view()),
    path("courses/<int:pk>", views.CourseDetail.as_view()),
    path("profiles", views.UserProfileList.as_view()),
    # path("profile/<int:pk>, ...),
    # path("sections/<int:pk>, ...),
    # path("profile/<int:pk>/attendance, ...),
    # ...
    # all endpoints listed here https://paper.dropbox.com/doc/Scheduler-2.0-K0ZNsLU5DZ7JjGudjqKIt
]

urlpatterns.extend(format_suffix_patterns(rest_urlpatterns))

# API Stub Routes
router = DefaultRouter()
router.register(r"attendances", views.AttendanceViewSet)
# router.register(r"profiles", views.ProfileViewSet)
router.register(r"sections", views.SectionViewSet)
router.register(r"spacetimes", views.SpacetimeViewSet)
router.register(r"overrides", views.OverrideViewSet)

urlpatterns.extend(router.urls)
