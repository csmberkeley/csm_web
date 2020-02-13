from django.contrib.admin import AdminSite as DefaultAdminSite
from django.conf import settings


class AdminSite(DefaultAdminSite):
    if settings.DJANGO_ENV != settings.DEVELOPMENT:
        # Use custom template which just redirects to standard login page,
        # thereby disabling Django's built-in admin login page
        login_template = 'admin/admin_login.html'
    site_header = "Scheduler Admin"
    site_title = "CSM Scheduler Admin"
    index_title = ""
