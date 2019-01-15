from django.contrib import admin
from scheduler.models import (
    User,
    Attendance,
    Course,
    Profile,
    Section,
    Spacetime,
    Override,
)

models = (User, Attendance, Course, Profile, Section, Spacetime, Override)
admin.site.register(models)
