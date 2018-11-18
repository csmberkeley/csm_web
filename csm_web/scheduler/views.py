from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth import logout as auth_logout

def login(request):
    return render(request, 'scheduler/login.html')

def logout(request):
    auth_logout(request)
    return redirect(reverse('index'))

def index(request):
    return render(request, 'scheduler/index.html', {'user': request.user})
