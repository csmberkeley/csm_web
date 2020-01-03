from datetime import timedelta
import random
import factory
import factory.fuzzy
from django.utils import timezone
from django.core import management
from django.conf import settings
from .models import (
    Course,
    Section,
    Spacetime,
    Student,
    Mentor,
    User,
    Attendance,
    Override,
)

COMPSCI_WORDS = ('Algorithms', 'Systems', 'Distributed', 'Efficient', 'Tractable', 'Programming', 'Languages')


class CourseFactory(factory.DjangoModelFactory):
    class Meta:
        model = Course

    name = factory.Sequence(lambda n: "CS%d" % n)
    valid_until = factory.Faker("date_between", start_date="+5w", end_date="+18w")
    enrollment_start = factory.LazyAttribute(
        lambda o: timezone.make_aware(
            factory.Faker(
                "date_time_between_dates",
                datetime_start=timezone.now() - timedelta(weeks=3),
                datetime_end=timezone.now() + timedelta(weeks=3),
            ).generate({})
        )
    )
    enrollment_end = factory.LazyAttribute(
        lambda o: timezone.make_aware(
            factory.Faker(
                "date_time_between_dates",
                datetime_start=o.enrollment_start,
                datetime_end=o.valid_until,
            ).generate({})
        )
    )
    permitted_absences = factory.LazyFunction(lambda: random.randint(1, 4))

    @factory.lazy_attribute
    def title(self):
        words = random.sample(COMPSCI_WORDS, 3)
        return f"{words[0]} for {words[1]} {words[2]}"


BUILDINGS = ("Cory", "Soda", "Kresge", "Moffitt")


class SpacetimeFactory(factory.DjangoModelFactory):
    class Meta:
        model = Spacetime

    _location = factory.LazyFunction(lambda: "%s %d" % (random.choice(BUILDINGS), random.randint(1, 500)))
    _start_time = factory.Faker("time_object")
    _duration = factory.LazyFunction(lambda: timedelta(minutes=random.choice((60, 90))))
    _day_of_week = factory.fuzzy.FuzzyChoice(Spacetime.DayOfWeek.values)


class UserFactory(factory.DjangoModelFactory):
    class Meta:
        model = User

    first_name = factory.LazyFunction(lambda: factory.Faker("name").generate({}).split()[0])
    last_name = factory.LazyFunction(lambda: factory.Faker("name").generate({}).split()[-1])
    username = factory.LazyAttributeSequence(lambda o, n: "%s_%s%d" % (o.first_name, o.last_name, n))
    email = factory.LazyAttribute(lambda o: "%s@berkeley.edu" % o.username)


class StudentFactory(factory.DjangoModelFactory):
    class Meta:
        model = Student

    user = factory.SubFactory(UserFactory)


class MentorFactory(factory.DjangoModelFactory):
    class Meta:
        model = Mentor

    user = factory.SubFactory(UserFactory)


class SectionFactory(factory.DjangoModelFactory):
    class Meta:
        model = Section

    spacetime = factory.SubFactory(SpacetimeFactory)
    capacity = factory.LazyFunction(lambda: random.randint(3, 6))
    mentor = factory.SubFactory(MentorFactory)


class AttendanceFactory(factory.DjangoModelFactory):
    class Meta:
        model = Attendance

    presence = factory.fuzzy.FuzzyChoice(Attendance.Presence.values)
    student = factory.SubFactory(StudentFactory)


class OverrideFactory(factory.DjangoModelFactory):
    class Meta:
        model = Override

    @factory.lazy_attribute
    def date(obj):
        date = factory.Faker(
            "date_between_dates",
            date_start=obj.overriden_spacetime.section.course.enrollment_start.date(),
            date_end=obj.overriden_spacetime.section.course.valid_until,
        ).generate({})
        return date + timedelta(days=(Spacetime.DayOfWeek.values.index(obj.spacetime.day_of_week) - date.weekday()))

    spacetime = factory.SubFactory(SpacetimeFactory)


def create_attendances_for(student):
    today = timezone.datetime.today().date()
    current_date = student.section.course.enrollment_start.date()
    while Spacetime.DayOfWeek.values[current_date.weekday()] != student.section.spacetime.day_of_week:
        current_date += timedelta(days=1)
    while current_date < student.section.course.valid_until:
        if current_date < today:
            AttendanceFactory.create(student=student, date=current_date)
        else:
            # Students cannot have attended or not attended sections that haven't happened yet
            AttendanceFactory.create(student=student, date=current_date, presence="")
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


def create_demo_accounts():
    demo_mentor = random.choice(Mentor.objects.all())
    demoify_user(demo_mentor.user, "demo_mentor")
    demo_student = random.choice(Student.objects.all())
    demoify_user(demo_student.user, "demo_student")
    print("\nDemo accounts have been created with usernames demo_mentor and demo_student")
    print("The password for these accounts is 'pass', log in at localhost:8000/admin/")


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
    if not settings.DEBUG:
        print("This cannot be run in production! Aborting.")
        return
    if (not preconfirm) and (not confirm_run()):
        return
    management.call_command("flush", interactive=False)
    course_names = ("CS70", "CS61A", "CS61B", "CS61C", "EE16A")
    print("Generating test data...")
    enrollment_start = timezone.now() - timedelta(days=14)
    enrollment_end = timezone.now() + timedelta(days=50)
    valid_until = timezone.now() + timedelta(days=100)
    for course_name in course_names:
        course = CourseFactory.create(name=course_name, enrollment_start=enrollment_start, enrollment_end=enrollment_end,
                                      valid_until=valid_until)
        print(course_name + "...", end=" ")
        for _ in range(random.randint(5, 10)):
            section = SectionFactory.create(course=course)
            students = StudentFactory.create_batch(random.randint(0, section.capacity), section=section)
            for student in students:
                create_attendances_for(student)
            section.students.set(students)
            section.save()
        print("Done")
    create_demo_accounts()
