import pytest

from scheduler.models import Section, SectionOccurrence, Spacetime
from scheduler.factories import SectionOccurrenceFactory, SectionFactory, SpacetimeFactory


@pytest.mark.django_db
def test_create_sectionOccurrence():
    user = User.objects.create(email="test@berkeley.edu", username="test")
    course = CourseFactory.create(name="course", title="title for course")
    mentor = Mentor.create(course=course, user=user)
    spacetime = SpacetimeFactory.create()

    section = spacetime.section#SectionFactory.create()#capacity=10, mentor=mentor, description="Test"
    date = timezone.datetime.today().date()
    
    sectionOccurrence, created = SectionOccurrence.get_or_create(section = section, date = date, spacetime = spacetime)
    assert created
    assert sectionOccurrence.spacetime == spacetime
    assert sectionOccurrence.date == date
    assert SectionOccurrence.objects.count() == 1
    assert SectionOccurrence.objects.get(spacetime=spacetime).section == section
    
@pytest.mark.django_db
def test_modify_spacetime():
    user = User.objects.create(email="test@berkeley.edu", username="test")
    course = CourseFactory.create(name="course", title="title for course")
    mentor = Mentor.create(course=course, user=user)
    spacetime = SpacetimeFactory.create()

    section = spacetime.section#SectionFactory.create()#capacity=10, mentor=mentor, description="Test"
    date = timezone.datetime.today().date()
    
    sectionOccurrence = SectionOccurrence.create(section = section, date = date, spacetime = spacetime)

    spacetime.date = timezone.datetime.tomorrow().date()
    spacetime.location = "Cory -5"
    assert SectionOccurrence.objects.spacetime.date == timezone.datetime.tomorrow().date()
    assert SectionOccurrence.objects.spacetime.location == "Cory -5"