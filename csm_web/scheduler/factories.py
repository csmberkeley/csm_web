import factory
import factory.fuzzy
from datetime import timedelta
from django.utils import timezone
import random
from django.core import management
from django.conf import settings
from django.db.models import signals
from .models import Course, Section, Spacetime, Profile, User, Attendance, Override


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

    location = factory.LazyFunction(
        lambda: "%s %d" % (random.choice(BUILDINGS), random.randint(1, 500))
    )
    start_time = factory.Faker("time_object")
    duration = factory.LazyFunction(lambda: timedelta(minutes=random.choice((60, 90))))
    day_of_week = factory.fuzzy.FuzzyChoice(DAY_OF_WEEK_DB_CHOICES)


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
    email = factory.LazyAttribute(lambda o: "%s@gmail.com" % o.username)


ROLE_DB_CHOICES = [db_value for db_value, display_name in Profile.ROLE_CHOICES]


class ProfileFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Profile

    leader = factory.SubFactory("scheduler.factories.ProfileFactory")
    course = factory.SubFactory(CourseFactory)
    role = factory.fuzzy.FuzzyChoice(ROLE_DB_CHOICES)
    user = factory.SubFactory(UserFactory)
    section = factory.SubFactory(
        "scheduler.factories.SectionFactory", course=factory.SelfAttribute("..course")
    )


class SectionFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Section

    course = factory.SubFactory(CourseFactory)
    default_spacetime = factory.SubFactory(SpacetimeFactory)
    capacity = factory.LazyFunction(lambda: random.randint(3, 6))


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
    section = factory.SubFactory(SectionFactory)
    attendee = factory.SubFactory(ProfileFactory)


class OverrideFactory(factory.DjangoModelFactory):
    @factory.django.mute_signals(
        signals.pre_save, signals.post_save, signals.pre_delete
    )
    class Meta:
        model = Override

    @factory.lazy_attribute
    def week_start(obj):
        start_date = factory.Faker(
            "date_between_dates",
            date_start=obj.section.course.enrollment_start.date(),
            date_end=obj.section.course.valid_until,
        ).generate({})
        start_date -= timedelta(days=start_date.weekday())
        return start_date

    spacetime = factory.SubFactory(SpacetimeFactory)
    section = factory.SubFactory(SectionFactory)


WEEKDAY_MAP = {
    number: pair[0] for number, pair in enumerate(Spacetime.DAY_OF_WEEK_CHOICES)
}


def create_attendances_for(student):
    today = timezone.datetime.today().date()
    current_date = student.course.enrollment_start.date()
    while (
        WEEKDAY_MAP[current_date.weekday()]
        != student.section.default_spacetime.day_of_week
    ):
        current_date += timedelta(days=1)
    while current_date < student.course.valid_until:
        if current_date < today:
            AttendanceFactory.create(
                attendee=student,
                section=student.section,
                week_start=current_date - timedelta(days=current_date.weekday()),
            )
        else:
            # Students cannot have attended or not attended sections that haven't happened yet
            AttendanceFactory.create(
                attendee=student,
                section=student.section,
                week_start=current_date - timedelta(days=current_date.weekday()),
                presence="",
            )
        current_date += timedelta(weeks=1)


def create_section_for(mentor):
    section = SectionFactory.create(course=mentor.course)
    mentor.section = section
    mentor.save()
    students = ProfileFactory.create_batch(
        random.randint(1, section.capacity),
        course=section.course,
        leader=mentor,
        section=section,
        role=Profile.STUDENT,
    )
    for student in students:
        create_attendances_for(student)
    return section


def complicate_data():
    for course in Course.objects.all():
        mentors = course.profile_set.filter(
            role__in=(Profile.JUNIOR_MENTOR, Profile.SENIOR_MENTOR)
        )
        other_course_sections = Section.objects.exclude(course=course)
        for _ in range(mentors.count() // 4):
            # randomly make 25% of mentors students in other courses
            mentor = random.choice(mentors)
            section = random.choice(other_course_sections)
            if section.current_student_count < section.capacity:
                mentor_student_profile = Profile.objects.create(
                    section=section,
                    leader=section.mentor,
                    course=section.course,
                    user=mentor.user,
                    role=Profile.STUDENT,
                )
                section.students.add(mentor_student_profile)
        for _ in range(mentors.count() // 4):
            # randomly assign 25% of mentors an additional section
            create_section_for(random.choice(mentors))
    for _ in range(Section.objects.count() // 4):
        # randomly create Overrides for 25% of sections
        OverrideFactory.create(section=random.choice(Section.objects.all()))


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
    demo_coordinator = random.choice(Profile.objects.filter(role=Profile.COORDINATOR))
    demoify_user(demo_coordinator.user, "demo_coordinator")
    demo_senior_mentor = random.choice(demo_coordinator.followers.all())
    assert demo_senior_mentor.role == Profile.SENIOR_MENTOR
    demoify_user(demo_senior_mentor.user, "demo_senior_mentor")
    demo_junior_mentor = random.choice(demo_senior_mentor.followers.all())
    assert demo_junior_mentor.role == Profile.JUNIOR_MENTOR
    demoify_user(demo_junior_mentor.user, "demo_junior_mentor")
    demo_student = random.choice(demo_junior_mentor.followers.all())
    assert demo_student.role == Profile.STUDENT
    demoify_user(demo_student.user, "demo_student")
    print(
        "\nDemo accounts have been created with usernames demo_coordinator, demo_junior_mentor, demo_senior_mentor, and demo_student."
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


def generate_test_data(complicate=False):
    if not settings.DEBUG:
        print("This cannot be run in production! Aborting.")
        return
    management.call_command("flush", interactive=True)
    original_signals = disable_signals()
    course_names = ("CS70", "CS61A", "CS61B", "CS61C", "EE16A")
    print("Generating test data...")
    for course in (CourseFactory.create(name=name) for name in course_names):
        print(course.name + "...", end=" ")
        coordinators = ProfileFactory.create_batch(
            2, course=course, leader=None, section=None, role=Profile.COORDINATOR
        )
        senior_mentors = ProfileFactory.create_batch(
            random.randint(4, 6),
            course=course,
            leader=coordinators[0],
            section=None,
            role=Profile.SENIOR_MENTOR,
        ) + ProfileFactory.create_batch(
            random.randint(4, 6),
            course=course,
            leader=coordinators[1],
            section=None,
            role=Profile.SENIOR_MENTOR,
        )

        for senior_mentor in senior_mentors:
            junior_mentors = ProfileFactory.create_batch(
                random.randint(4, 6),
                course=course,
                leader=senior_mentor,
                section=None,
                role=Profile.JUNIOR_MENTOR,
            )
            for junior_mentor in junior_mentors:
                create_section_for(junior_mentor)

        print("Done")
    open_course = Course.objects.get(name="CS61A")
    open_course.enrollment_start = timezone.now() - timedelta(days=14)
    open_course.enrollment_end = timezone.now() + timedelta(days=14)
    open_course.valid_until = timezone.now() + timedelta(days=100)
    open_course.save()
    if complicate:
        complicate_data()
    create_demo_accounts()
    reenable_signals(original_signals)
