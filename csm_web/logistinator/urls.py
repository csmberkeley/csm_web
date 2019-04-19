from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AvailabilityViewSet

from django.contrib import admin
from django.urls import path, include

from rest_framework.urlpatterns import format_suffix_patterns
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"availabilities", AvailabilityViewSet, basename="availability")
urlpatterns = router.urls

rest_urlpatterns = [
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
]

urlpatterns.extend(format_suffix_patterns(rest_urlpatterns))
