import factory
import factory.fuzzy
from datetime import timedelta
import random
from django.core import management
from django.conf import settings
from .models import Course, Section, Spacetime, Profile, User


class CourseFactory(factory.DjangoModelFactory):
    class Meta:
        model = Course
    name = factory.Sequence(lambda n: "CS%d" % n)
    valid_until = factory.Faker('date_between', start_date='-1y', end_date='+1y')
    enrollment_start = factory.LazyAttribute(lambda o: factory.Faker('date_time_between_dates', datetime_start=o.valid_until - timedelta(weeks=17), datetime_end=o.valid_until - timedelta(weeks=1)).generate({}))
    enrollment_end = factory.LazyAttribute(lambda o: factory.Faker('date_time_between_dates', datetime_start=o.enrollment_start, datetime_end=o.valid_until).generate({}))


BUILDINGS = ('Cory', 'Soda', 'Kresge', 'Moffitt')
DAY_OF_WEEK_DB_CHOICES = [db_value for db_value, display_name in Spacetime.DAY_OF_WEEK_CHOICES]


class SpacetimeFactory(factory.DjangoModelFactory):
    class Meta:
        model = Spacetime
    location = factory.LazyFunction(lambda: "%s %d" % (random.choice(BUILDINGS), random.randint(1, 500)))
    start_time = factory.Faker('time_object')
    duration = factory.LazyFunction(lambda: timedelta(minutes=random.choice((60, 90))))
    day_of_week = factory.fuzzy.FuzzyChoice(DAY_OF_WEEK_DB_CHOICES)


class UserFactory(factory.DjangoModelFactory):
    class Meta:
        model = User
    username = factory.Sequence(lambda n: "%s%d" % (factory.Faker('name').generate({}).replace(' ', '_'), n))


ROLE_DB_CHOICES = [db_value for db_value, display_name in Profile.ROLE_CHOICES]


class ProfileFactory(factory.DjangoModelFactory):
    class Meta:
        model = Profile
    leader = factory.SubFactory('scheduler.factories.ProfileFactory')
    course = factory.SubFactory(CourseFactory)
    role = factory.fuzzy.FuzzyChoice(ROLE_DB_CHOICES)
    user = factory.SubFactory(UserFactory)
    section = factory.SubFactory('scheduler.factories.SectionFactory', course=factory.SelfAttribute('..course'))
#    mentor_sections = factory.RelatedFactory('scheduler.factories.SectionFactory', course=factory.SelfAttribute('mentor.course'))


class SectionFactory(factory.DjangoModelFactory):
    class Meta:
        model = Section
    course = factory.SubFactory(CourseFactory)
    default_spacetime = factory.SubFactory(SpacetimeFactory)
    capacity = factory.LazyFunction(lambda: random.randint(3, 6))
    mentor = factory.SubFactory(ProfileFactory, course=factory.SelfAttribute('..course'))


def generate_test_data():
    if not settings.DEBUG:
        print('This cannot be run in production! Aborting.')
        return
    management.call_command('flush', interactive=True)
    course_names = ('CS70', 'CS61A', 'CS61B', 'CS61C', 'EE16A')
    for name in course_names:
        CourseFactory.create(name=name)
    for course in Course.objects.all():
        coordinators = ProfileFactory.create_batch(2, course=course, leader=None, section=None, role=Profile.COORDINATOR)
        senior_mentors = ProfileFactory.create_batch(random.randint(4, 10), course=course, leader=random.choice(coordinators), section=None, role=Profile.SENIOR_MENTOR)
        for senior_mentor in senior_mentors:
            junior_mentors = ProfileFactory.create_batch(random.randint(4, 6), course=course, leader=senior_mentor, section=None, role=Profile.JUNIOR_MENTOR)
            for junior_mentor in junior_mentors:
                mentor_section = junior_mentor.mentor_sections.first()
                if not mentor_section:
                    mentor_section = SectionFactory.create(course=junior_mentor.course, mentor=junior_mentor)
                ProfileFactory.create_batch(random.randint(1, mentor_section.capacity), course=course, leader=junior_mentor, section=mentor_section, role=Profile.STUDENT)



