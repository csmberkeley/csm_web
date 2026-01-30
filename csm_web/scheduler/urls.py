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
    path("waitlist/<int:pk>/add/", views.waitlistedStudent.add),
    path("waitlist/<int:pk>/drop/", views.waitlistedStudent.drop),
    path("waitlist/<int:pk>/", views.waitlistedStudent.view),
    path("waitlist/<int:pk>/coordadd/", views.waitlistedStudent.add_by_coord),
    path(
        "waitlist/<int:pk>/count_waitlist/",
        views.waitlistedStudent.count_waitist,
    ),
    path("export/", views.export_data),
]
