from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import AvailabilityViewSet

router = DefaultRouter()
router.register(r"availabilities", AvailabilityViewSet, basename="availability")
urlpatterns = router.urls
