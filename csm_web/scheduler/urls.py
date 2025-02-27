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
    path("userinfo/", views.userinfo, name="userinfo"),
    path("matcher/active/", views.matcher.active),
    path("matcher/<int:pk>/slots/", views.matcher.slots),
    path("matcher/<int:pk>/preferences/", views.matcher.preferences),
    path("matcher/<int:pk>/assignment/", views.matcher.assignment),
    path("matcher/<int:pk>/mentors/", views.matcher.mentors),
    path("matcher/<int:pk>/configure/", views.matcher.configure),
    path("matcher/<int:pk>/create/", views.matcher.create),
    path("coord/<int:pk>/student/", views.coord.view_students),
    path("coord/<int:pk>/create/", views.coord.view_mentors),
    path("export/", views.export_data),
]
