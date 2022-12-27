from django.contrib.admin import AdminSite as DefaultAdminSite
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.conf import settings
from django.shortcuts import redirect


class AdminSite(DefaultAdminSite):
    site_header = f"{'Development ' if settings.DJANGO_ENV != settings.PRODUCTION else ''}Scheduler Admin"
    site_title = "CSM Scheduler Admin"
    index_title = ""

    @method_decorator(never_cache)
    def login(self, request, extra_context=None):
        if settings.DJANGO_ENV not in (settings.DEVELOPMENT, settings.STAGING):
            """
            Disable Django's built-in admin login page outside of development
            because it's a security liability
            """
            return redirect('/')
        return super().login(request, extra_context)

    def each_context(self, request):
        context = super().each_context(request)
        context['DJANGO_ENV'] = settings.DJANGO_ENV
        return context
