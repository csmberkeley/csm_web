from datetime import timedelta
import random
import factory
import factory.fuzzy
from django.utils import timezone
from django.core import management
from django.conf import settings
from django.db.models import signals
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


class CourseFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
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


BUILDINGS = ("Cory", "Soda", "Kresge", "Moffitt")
DAY_OF_WEEK_DB_CHOICES = [
    db_value for db_value, display_name in Spacetime.DAY_OF_WEEK_CHOICES
]


class SpacetimeFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Spacetime

    _location = factory.LazyFunction(
        lambda: "%s %d" % (random.choice(BUILDINGS), random.randint(1, 500))
    )
    _start_time = factory.Faker("time_object")
    _duration = factory.LazyFunction(lambda: timedelta(minutes=random.choice((60, 90))))
    _day_of_week = factory.fuzzy.FuzzyChoice(DAY_OF_WEEK_DB_CHOICES)


class UserFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = User

    first_name = factory.LazyFunction(
        lambda: factory.Faker("name").generate({}).split()[0]
    )
    last_name = factory.LazyFunction(
        lambda: factory.Faker("name").generate({}).split()[-1]
    )
    username = factory.LazyAttributeSequence(
        lambda o, n: "%s_%s%d" % (o.first_name, o.last_name, n)
    )
    email = factory.LazyAttribute(lambda o: "%s@berkeley.edu" % o.username)


class StudentFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Student

    user = factory.SubFactory(UserFactory)


class MentorFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Mentor

    user = factory.SubFactory(UserFactory)


class SectionFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Section

    spacetime = factory.SubFactory(SpacetimeFactory)
    capacity = factory.LazyFunction(lambda: random.randint(3, 6))
    mentor = factory.SubFactory(MentorFactory)


PRESENCE_DB_VALUES = [
    db_value for db_value, display_name in Attendance.PRESENCE_CHOICES
]


class AttendanceFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Attendance

    presence = factory.fuzzy.FuzzyChoice(PRESENCE_DB_VALUES)
    student = factory.SubFactory(StudentFactory)


class OverrideFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Override

    @factory.lazy_attribute
    def date(obj):
        return factory.Faker(
            "date_between_dates",
            date_start=obj.overriden_spacetime.section.course.enrollment_start.date(),
            date_end=obj.overriden_spacetime.section.course.valid_until,
        ).generate({})

    spacetime = factory.SubFactory(SpacetimeFactory)


WEEKDAY_MAP = {
    number: pair[0] for number, pair in enumerate(Spacetime.DAY_OF_WEEK_CHOICES)
}


def create_attendances_for(student):
    today = timezone.datetime.today().date()
    current_date = student.section.course.enrollment_start.date()
    while WEEKDAY_MAP[current_date.weekday()] != student.section.spacetime.day_of_week:
        current_date += timedelta(days=1)
    while current_date < student.section.course.valid_until.date():
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
    user.email = "{}@berkeley.edu".format(username)
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
    print(
        "\nDemo accounts have been created with usernames demo_mentor and demo_student"
    )
    print("The password for these accounts is 'pass', log in at localhost:8000/admin/")


def disable_signals():
    original_signals = []
    for signal in (
        signals.pre_save,
        signals.pre_delete,
        signals.post_save,
        signals.post_delete,
    ):
        original_signals.append((signal, signal.receivers))
        signal.receivers = []
    return original_signals


def reenable_signals(original_signals):
    for signal, receivers in original_signals:
        signal.receivers = receivers


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
    original_signals = disable_signals()
    course_names = ("CS70", "CS61A", "CS61B", "CS61C", "EE16A")
    print("Generating test data...")
    enrollment_start = timezone.now() - timedelta(days=14)
    enrollment_end = timezone.now() + timedelta(days=50)
    valid_until = timezone.now() + timedelta(days=100)
    for course_name in course_names:
        course = CourseFactory.create(
            name=course_name,
            enrollment_start=enrollment_start,
            enrollment_end=enrollment_end,
            valid_until=valid_until,
        )
        print(course_name + "...", end=" ")
        for _ in range(random.randint(5, 10)):
            section = SectionFactory.create(course=course)
            students = StudentFactory.create_batch(
                random.randint(0, section.capacity), section=section
            )
            for student in students:
                create_attendances_for(student)
            section.students.set(students)
            section.save()
        print("Done")
    create_demo_accounts()
    reenable_signals(original_signals)
