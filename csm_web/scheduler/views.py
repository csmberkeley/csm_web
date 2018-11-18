from django.shortcuts import render, redirect
from django.urls import reverse
from django.contrib.auth import logout as auth_logout

from rest_framework import generics, permissions

from .models import Course
from .serializers import CourseSerializer
from .permissions import IsLeader, IsLeaderOrReadOnly

def login(request):
    return render(request, 'scheduler/login.html')

def logout(request):
    auth_logout(request)
    return redirect(reverse('index'))

def index(request):
    return render(request, 'scheduler/index.html', {'user': request.user})

# REST Framework API Views

class CourseList(generics.ListCreateAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

class CourseDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)
