import pytest

from django.utils import timezone
from scheduler.models import Section, SectionOccurrence, Spacetime, User, Mentor
from scheduler.factories import CourseFactory, SectionOccurrenceFactory, SectionFactory, SpacetimeFactory


@pytest.mark.django_db
def test_create_sectionOccurrence():
    user = User.objects.create(email="test@berkeley.edu", username="test")
    course = CourseFactory.create(name="course", title="title for course")
    mentor = Mentor.objects.create(course=course, user=user)
    spacetime = SpacetimeFactory.create()

    section = SectionFactory.create(spacetimes=[spacetime])#SectionFactory.create()#capacity=10, mentor=mentor, description="Test"
    date = timezone.datetime.today().date()
    
    sectionOccurrence, created = SectionOccurrence.objects.get_or_create(section = section, date = date, spacetime = spacetime)
    assert created
    assert sectionOccurrence.spacetime == spacetime
    assert sectionOccurrence.date == date
    assert SectionOccurrence.objects.count() == 1
    assert SectionOccurrence.objects.get(spacetime=spacetime).section == section
    
@pytest.mark.django_db
def test_modify_spacetime():
    user = User.objects.create(email="test@berkeley.edu", username="test")
    course = CourseFactory.create(name="course", title="title for course")
    mentor = Mentor.objects.create(course=course, user=user)
    spacetime = SpacetimeFactory.create()

    section = SectionFactory.create(spacetimes=[spacetime])#SectionFactory.create()#capacity=10, mentor=mentor, description="Test"
    date = timezone.datetime.today().date()
    
    sectionOccurrence = SectionOccurrence.objects.create(section = section, date = date, spacetime = spacetime)

    spacetime.location = "Cory -5"
    spacetime.save()
    
    sectionOccurrence.refresh_from_db()

    assert sectionOccurrence.spacetime.location == "Cory -5"