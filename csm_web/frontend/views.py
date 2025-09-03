from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def index(request):
    return render(
        request, "frontend/index.html", context={"DJANGO_ENV": settings.DJANGO_ENV}
    )
