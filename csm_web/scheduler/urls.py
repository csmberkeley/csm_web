from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'sections', views.SectionViewSet, basename='section')
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'spacetimes', views.SpacetimeViewSet, basename='spacetime')

urlpatterns = router.urls + [
    path("mentor-info", views.MentorBioInfoDetail.as_view()),
]
