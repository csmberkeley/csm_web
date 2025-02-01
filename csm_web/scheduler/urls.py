from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r"courses", views.CourseViewSet, basename="course")
router.register(r"sections", views.SectionViewSet, basename="section")
router.register(r"students", views.StudentViewSet, basename="student")
router.register(r"profiles", views.ProfileViewSet, basename="profile")
router.register(r"spacetimes", views.SpacetimeViewSet, basename="spacetime")
router.register(r"users", views.UserViewSet, basename="user")
router.register(r"resources", views.ResourceViewSet, basename="resource")

urlpatterns = router.urls

urlpatterns += [
    path("user/", views.user_info, name="user"),
    path("user/<int:pk>/", views.user_retrieve, name="user_retrieve"),
    path("user/<int:pk>/update/", views.user_update, name="user_update"),
    path("user/upload_image/", views.upload_image, name="upload_image"),
    path("matcher/active/", views.matcher.active),
    path("matcher/<int:pk>/slots/", views.matcher.slots),
    path("matcher/<int:pk>/preferences/", views.matcher.preferences),
    path("matcher/<int:pk>/assignment/", views.matcher.assignment),
    path("matcher/<int:pk>/mentors/", views.matcher.mentors),
    path("matcher/<int:pk>/configure/", views.matcher.configure),
    path("matcher/<int:pk>/create/", views.matcher.create),
    path("export/", views.export_data),
]
