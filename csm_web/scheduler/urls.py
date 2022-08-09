from rest_framework.routers import DefaultRouter
from django.urls import path

from . import views

router = DefaultRouter()
router.register(r'courses', views.CourseViewSet, basename='course')
router.register(r'sections', views.SectionViewSet, basename='section')
router.register(r'students', views.StudentViewSet, basename='student')
router.register(r'profiles', views.ProfileViewSet, basename='profile')
router.register(r'spacetimes', views.SpacetimeViewSet, basename='spacetime')
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'resources', views.ResourceViewSet, basename='resource')

urlpatterns = router.urls
urlpatterns += [
    path('userinfo/', views.userinfo, name='userinfo'),

    # path('sections/<int:section_id>/labels/<int:label_id>/delete', views.labels.delete),
    # path('sections/<int:section_id>/delete-labels', views.labels.delete)
    # labels paths
    # path()
]
