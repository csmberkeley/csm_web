from django.urls import path, re_path

from . import views

urlpatterns = [
    # catch index path
    path("", views.index),
    # catch all other subpaths
    re_path(r"^.*/$", views.index),
]
