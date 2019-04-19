from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.urlpatterns import format_suffix_patterns

from . import views
from .views import AvailabilityViewSet

from rest_framework.urlpatterns import format_suffix_patterns
from rest_framework.routers import DefaultRouter

urlpatterns = []

rest_urlpatterns = [
    path("matching/create", views.CreateMatching.as_view()),
    path("matching/delete/<int:pk>", views.DeleteMatching.as_view()),
    path("matching/update/<int:pk>", views.update_matching, name="update_matching"),
implementation
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
    path("matching/get_all", views.MatchingList.as_view()),
    path(
        "availability/<int:pk>/get_availability",
        views.get_availability,
        name="get_availability",
    ),
    path(
        "availability/<int:pk>/get_full_availability",
        views.get_full_availability,
        name="get_full_availability",
    ),
    path(
        "availability/<int:pk>/set_availability",
        views.set_availability,
        name="set_availability",
    ),
    path("conflict/create", views.CreateConflict.as_view()),
    path("conflict/get_all", views.ConflictList.as_view())
]

router = DefaultRouter()
router.register(r"availabilities", AvailabilityViewSet, basename="availability")
urlpatterns = router.urls

urlpatterns.extend(format_suffix_patterns(rest_urlpatterns))
