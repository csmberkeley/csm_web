from django.contrib.admin import AdminSite as DefaultAdminSite
from django.views.decorators.cache import never_cache
from django.conf import settings
from django.shortcuts import redirect


class AdminSite(DefaultAdminSite):
    site_header = "Scheduler Admin"
    site_title = "CSM Scheduler Admin"
    index_title = ""
    @never_cache
    def login(self, request, extra_context=None):
        if settings.DJANGO_ENV != settings.DEVELOPMENT:
            """
            Disable Django's built-in admin login page outside of development
            because it's a security liability
            """
            return redirect('/')
        return super().login(request, extra_context)
