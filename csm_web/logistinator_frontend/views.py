from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.conf import settings

# This should have @login_required but I've disabled it so that we don't have to setup
# dev OAuth credentials
# @login_required
def index(request):
    return render(
        request,
        "logistinator_frontend/index.html",
        context={"DJANGO_ENV": settings.DJANGO_ENV},
    )
