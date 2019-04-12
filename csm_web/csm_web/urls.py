"""csm_web URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.contrib.auth.views import logout_then_login
from django.urls import path, include
from django.shortcuts import render

from django.conf import settings
from django.conf.urls.static import static
from django.contrib.staticfiles.views import serve
from django.views.decorators.cache import cache_control

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("scheduler.urls")),
    path("api/logistinator/", include("logistinator.urls")),
    path("logistinator/", include("logistinator.urls")),
    path("login/", lambda request: render(request, "frontend/login.html")),
    path("logout/", logout_then_login),
    path("", include("social_django.urls", namespace="social")),
    path("", include("frontend.urls")),
]

if settings.DJANGO_ENV == settings.DEVELOPMENT:
    # Don't cache static files in development
    urlpatterns += static(
        settings.STATIC_URL,
        view=cache_control(no_cache=True, must_revalidate=True)(serve),
    )
