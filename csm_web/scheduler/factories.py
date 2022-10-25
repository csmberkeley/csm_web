from datetime import timedelta
import random
import factory
import factory.fuzzy
import faker
from django.utils import timezone
from django.core import management
from django.conf import settings
from django.db.models import Count
from .models import (
    Course,
    Resource,
    Section,
    SectionOccurrence,
    Spacetime,
    Student,
    Mentor,
    User,
    Attendance,
    Override,
    Coordinator,
    DayOfWeekField,
    Label,
    day_to_number,
    week_bounds
)


def evaluate_faker(faker):
    return faker.evaluate(None, None, {'locale': None})


COMPSCI_WORDS = ('Algorithms', 'Systems', 'Distributed', 'Efficient', 'Tractable', 'Programming',
                 'Languages', 'Machine Learning', 'AI', 'Blockchain', 'Parallel', 'Architecture')


class CourseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Course

    name = factory.Sequence(lambda n: "CS%d" % n)
    valid_until = factory.Faker("date_between", start_date="+5w", end_date="+18w")
    enrollment_start = factory.LazyAttribute(
        lambda o: timezone.make_aware(
            faker.Faker().date_time_between_dates(
                datetime_start=timezone.now() - timedelta(weeks=3),
                datetime_end=timezone.now() - timedelta(weeks=2),
            )
        )
    )
    section_start = factory.LazyAttribute(
        lambda o: timezone.make_aware(
            faker.Faker().date_time_between_dates(
                datetime_start=o.enrollment_start + timedelta(weeks=1),
                datetime_end=o.enrollment_start + timedelta(weeks=3),
            )
        )
    )
    enrollment_end = factory.LazyAttribute(
        lambda o: timezone.make_aware(
            faker.Faker().date_time_between_dates(
                datetime_start=timezone.now() + timedelta(weeks=2),
                datetime_end=o.valid_until,
            )
        )
    )
    permitted_absences = factory.LazyFunction(lambda: random.randint(1, 4))

    @factory.lazy_attribute
    def title(self):
        words = random.sample(COMPSCI_WORDS, 3)
        return f"{words[0]} for {words[1]} {words[2]}"


BUILDINGS = ("Cory", "Soda", "Kresge", "Moffitt")


class SpacetimeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Spacetime

    location = factory.LazyFunction(lambda: "%s %d" % (random.choice(BUILDINGS), random.randint(1, 500)))
    start_time = factory.Faker("time_object")
    duration = factory.LazyFunction(lambda: timedelta(minutes=random.choice((60, 90))))
    day_of_week = factory.fuzzy.FuzzyChoice(DayOfWeekField.DAYS)


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    first_name = factory.LazyFunction(lambda: evaluate_faker(factory.Faker("name")).split()[0])
    last_name = factory.LazyFunction(lambda: evaluate_faker(factory.Faker("name")).split()[-1])
    username = factory.LazyAttributeSequence(lambda o, n: "%s_%s%d" % (o.first_name, o.last_name, n))
    email = factory.LazyAttribute(lambda o: "%s@berkeley.edu" % o.username)


class StudentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Student

    user = factory.SubFactory(UserFactory)
    course = factory.SubFactory(CourseFactory)


class MentorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Mentor

    user = factory.SubFactory(UserFactory)
    course = factory.SubFactory(CourseFactory)


class CoordinatorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Coordinator

    user = factory.SubFactory(UserFactory)
    course = factory.SubFactory(CourseFactory)


class SectionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Section

    capacity = factory.LazyFunction(lambda: random.randint(3, 6))

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        if 'spacetimes' not in kwargs:
            spacetimes = SpacetimeFactory.create_batch(random.randint(1, 2))
            # We want to ensure that if there are 2 spacetimes for a section that they are for different days of the week
            for spacetime, day in zip(spacetimes, random.sample(DayOfWeekField.DAYS, len(spacetimes))):
                spacetime.day_of_week = day
                spacetime.save()
        else:
            spacetimes = kwargs.pop('spacetimes')
        obj = model_class.objects.create(*args, **kwargs)
        obj.spacetimes.set(spacetimes)
        obj.save()
        return obj


class SectionOccurrenceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SectionOccurrence


class AttendanceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Attendance

    presence = factory.fuzzy.FuzzyChoice(Attendance.Presence.values)
    student = factory.SubFactory(StudentFactory)


class OverrideFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Override

    @factory.lazy_attribute
    def date(obj):
        date = evaluate_faker(factory.Faker(
            "date_between_dates",
            date_start=obj.overriden_spacetime.section.mentor.course.enrollment_start.date(),
            date_end=obj.overriden_spacetime.section.mentor.course.valid_until,
        ))
        return date + timedelta(days=(day_to_number(obj.spacetime.day_of_week) - date.weekday()))

    spacetime = factory.SubFactory(SpacetimeFactory)


class ResourceFactory(factory.django.DjangoModelFactory):

    class Meta:
        model = Resource


LABEL_NAMES = ("EOP", "Seed Scholar", "Women-Affinity")


class LabelFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Label

    course = factory.SubFactory(CourseFactory)
    name = factory.LazyFunction(lambda: random.choice(LABEL_NAMES))
    description = "hello"


def create_attendances_for(student):
    today = timezone.datetime.today().date()
    current_date = week_bounds(student.course.section_start)[0]
    spacetime_days = [day_to_number(day_of_week)
                      for day_of_week in student.section.spacetimes.values_list("day_of_week", flat=True)]
    existing_attendance_dates = set(student.attendance_set.values_list("sectionOccurrence__date", flat=True))
    while current_date < student.course.valid_until:
        for spacetime_day in spacetime_days:
            date = current_date + timedelta(days=spacetime_day)
            if date not in existing_attendance_dates:
                so = student.section.sectionoccurrence_set.get(date=date)
                if current_date < today:
                    AttendanceFactory.create(student=student, sectionOccurrence=so)
                else:
                    # Students cannot have attended or not attended sections that haven't happened yet
                    AttendanceFactory.create(student=student, sectionOccurrence=so, presence="")
        current_date += timedelta(weeks=1)


def demoify_user(user, username):
    user.is_staff = True
    user.is_superuser = True
    user.username = username
    user.email = f"{username}@berkeley.edu"
    name_parts = username.split("_")
    user.first_name, user.last_name = (
        name_parts[0].capitalize(),
        "".join(name_parts[1:]).capitalize(),
    )
    user.set_password("pass")
    user.save()


def create_demo_account():
    demo_mentor = random.choice(Mentor.objects.annotate(
        Count('section__spacetimes')).filter(section__spacetimes__count=2))
    second_section = random.choice(Section.objects.filter(
        mentor__course=demo_mentor.course).exclude(pk=demo_mentor.section.pk))
    demo_mentor_2 = second_section.mentor
    demo_mentor_2.user = demo_mentor.user
    demo_mentor_2.save()
    demoify_user(demo_mentor.user, "demo_user")
    demo_student = random.choice(Student.objects.exclude(course=demo_mentor.course))
    demo_student.user = demo_mentor.user
    demo_student.save()
    demo_coord = Coordinator.objects.create(user=demo_mentor.user, course=random.choice(
        Course.objects.exclude(pk__in=(demo_mentor.course.pk, demo_student.course.pk))))
    print("""
    A demo account has been created with username 'demo_user' and password 'pass'
    Log in at localhost:8000/admin/
    """
          )
    demo_coord_2 = Coordinator.objects.create(user=demo_mentor.user, course=random.choice(
        Course.objects.exclude(pk__in=(demo_mentor.course.pk, demo_student.course.pk, demo_coord.course.pk))))
    # delete all mentors associated with the second course
    Mentor.objects.filter(course=demo_coord_2.course).delete()
    # create new mentors associated with demo coord's course
    mentors = [MentorFactory.create(course=demo_coord_2.course) for _ in range(50)]

    # allow one mentor to login through admin menu
    demoify_user(mentors[0].user, "demo_mentor")
    print("""
    A demo mentor has been created with username 'demo_mentor' and password 'pass'
    Log in at localhost:8000/admin/
    """)


def confirm_run():
    choice = input(
        """You have requested a flush of the database.
            This will DELETE EVERYTHING IN THE DATABASE, and return all tables to an empty state.

            Are you sure you want to do this?

            Type 'yes' to continue, or 'no' to abort:  """
    )
    while choice not in ("yes", "no"):
        choice = input("Please type 'yes' or 'no' (without the quotes):  ")
    return choice == "yes"


def generate_test_data(preconfirm=False):
    if settings.DJANGO_ENV == settings.PRODUCTION:
        print("This cannot be run in production! Aborting.")
        return
    if (not preconfirm) and (not confirm_run()):
        return
    management.call_command("flush", interactive=False)
    course_names = ("CS61A", "CS61B", "CS61C", "CS70", "CS88", "EE16A", "EE16B")
    course_titles = ("Structure and Interpretation of Computer Programs", "Data Structures", "Machine Structures",
                     "Discrete Mathematics and Probability Theory", "Computational Structures in Data Science", "Designing Information Devices and Systems I",
                     "Designing Information Devices and Systems II")
    print("Generating test data...")
    enrollment_start = timezone.now() - timedelta(days=14)
    enrollment_end = timezone.now() + timedelta(days=50)
    valid_until = timezone.now() + timedelta(days=100)
    for course_name, course_title in zip(course_names, course_titles):
        course = CourseFactory.create(name=course_name, title=course_title, enrollment_start=enrollment_start, enrollment_end=enrollment_end,
                                      valid_until=valid_until)
        print(course_name + "...", end=" ")
        for _ in range(random.randint(5, 10)):
            mentor = MentorFactory.create(course=course)
            section = SectionFactory.create(mentor=mentor)

            current_date = week_bounds(section.mentor.course.section_start)[0]
            spacetime_days = [day_to_number(day_of_week)
                              for day_of_week in section.spacetimes.values_list("day_of_week", flat=True)]
            while current_date < section.mentor.course.valid_until:
                for spacetime_day in spacetime_days:
                    date = current_date + timedelta(days=spacetime_day)
                    SectionOccurrenceFactory.create(section=section, date=date)
                current_date += timedelta(weeks=1)

            students = StudentFactory.create_batch(random.randint(0, section.capacity), section=section, course=course)
            for student in students:
                create_attendances_for(student)
            section.students.set(students)
            section.save()
        print("Done generating sections")
        for i in range(random.randint(3, 5)):
            date = enrollment_start + timedelta(days=7*i)
            val = random.randint(1, 100)
            ResourceFactory.create(course=course, week_num=i+1, date=date, topics=f"Topic {val}")
        print("Done generating resources")
    create_demo_account()
