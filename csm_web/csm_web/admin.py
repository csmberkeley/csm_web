from django.contrib.admin import AdminSite as DefaultAdminSite
from django.conf import settings


class AdminSite(DefaultAdminSite):
    if settings.DJANGO_ENV != settings.DEVELOPMENT:
        login_template = 'admin_login.html'
