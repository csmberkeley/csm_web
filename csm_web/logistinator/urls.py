from django.contrib import admin
from django.urls import path, include

from rest_framework.urlpatterns import format_suffix_patterns
from rest_framework.routers import DefaultRouter

from . import views

urlpatterns = []

rest_urlpatterns = [
    path("matching/create", views.CreateMatching.as_view()),
    path("matching/delete/<int:pk>", views.DeleteMatching.as_view()),
    path("matching/update/<int:pk>", views.update, name="update"),
    path(
        "matching/get_by_user/<int:user_id>",
        views.MatchingUserList.as_view(),
        name="get_by_user",
    ),  
    path(
        "matching/get_by_room/<int:room_id>",
        views.MatchingRoomList.as_view(),
        name="get_by_room",
    ),
    path("matching/get_all", views.MatchingList.as_view())
    # all endpoints listed here https://paper.dropbox.com/doc/Scheduler-2.0-K0ZNsLU5DZ7JjGudjqKIt
]

urlpatterns.extend(format_suffix_patterns(rest_urlpatterns))
