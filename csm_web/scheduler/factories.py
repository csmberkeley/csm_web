import random
import time
from datetime import timedelta

import factory
import factory.fuzzy
import faker
from django.conf import settings
from django.core import management
from django.db.models import Count
from django.utils import timezone

from .models import (
    Attendance,
    Coordinator,
    Course,
    DayOfWeekField,
    Mentor,
    Override,
    Resource,
    Section,
    SectionOccurrence,
    Spacetime,
    Student,
    User,
    WaitlistedStudent,
    day_to_number,
    week_bounds,
)


def evaluate_faker(faker_obj: factory.Faker):
    """Evaluate a faker object with all defaults"""
    return faker_obj.evaluate(None, None, {"locale": None})


COMPSCI_WORDS = (
    "Algorithms",
    "Systems",
    "Distributed",
    "Efficient",
    "Tractable",
    "Programming",
    "Languages",
    "Machine Learning",
    "AI",
    "Blockchain",
    "Parallel",
    "Architecture",
)

COURSE_INFO = [
    # (name, title, is_restricted)
    ("CSM61A", "Structure and Interpretation of Computer Programs", False),
    ("CSM61B", "Data Structures", False),
    ("CSM61C", "Machine Structures", False),
    ("CSM70", "Discrete Mathematics and Probability Theory", False),
    ("CSM88", "Computational Structures in Data Science", False),
    ("CSM16A", "Designing Information Devices and Systems I", False),
    ("CSM16B", "Designing Information Devices and Systems II", False),
    ("CS61A", "Structure and Interpretation of Computer Programs", True),
    ("CS61B", "Data Structures", True),
    ("CS61C", "Machine Structures", True),
    ("CS70", "Discrete Mathematics and Probability Theory", True),
    ("CS88", "Computational Structures in Data Science", True),
    ("EECS16A", "Designing Information Devices and Systems I", True),
    ("EECS16B", "Designing Information Devices and Systems II", True),
]

LARGE_COURSE_INFO = [
    # (name, title, (min_sections, max_sections), (min_students, max_students))
    ("LARGE1", "Course with many small sections", (40, 60), (3, 10)),
    ("LARGE2", "Course with a few large sections", (5, 10), (40, 60)),
    ("LARGE3", "Course with many large sections", (40, 60), (40, 60)),
]


class CourseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Course

    name = factory.Sequence(lambda n: f"CS{n}")
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
        """Construct random course title"""
        words = random.sample(COMPSCI_WORDS, 3)
        return f"{words[0]} for {words[1]} {words[2]}"


BUILDINGS = ("Cory", "Soda", "Kresge", "Moffitt")
DEFAULT_WAITLIST_CAP = 3


class SpacetimeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Spacetime

    location = factory.LazyFunction(
        lambda: f"{random.choice(BUILDINGS)} {random.randint(1, 500)}"
    )
    start_time = factory.Faker("time_object")
    duration = factory.LazyFunction(lambda: timedelta(minutes=random.choice((60, 90))))
    day_of_week = factory.fuzzy.FuzzyChoice(DayOfWeekField.DAYS)


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    first_name = factory.LazyFunction(
        lambda: evaluate_faker(factory.Faker("name")).split()[0]
    )
    last_name = factory.LazyFunction(
        lambda: evaluate_faker(factory.Faker("name")).split()[-1]
    )
    username = factory.LazyAttributeSequence(
        lambda o, n: f"{o.first_name}_{o.last_name}{n}"
    )
    email = factory.LazyAttribute(lambda o: f"{o.username}@berkeley.edu")


class StudentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Student

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        if "user" in kwargs and "course" in kwargs:
            # handle whitelist
            if kwargs["course"].is_restricted:
                kwargs["course"].whitelist.add(kwargs["user"])
        return super()._create(model_class, *args, **kwargs)

    user = factory.SubFactory(UserFactory)
    course = factory.SubFactory(CourseFactory)


class MentorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Mentor

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        if "user" in kwargs and "course" in kwargs:
            # handle whitelist
            if kwargs["course"].is_restricted:
                kwargs["course"].whitelist.add(kwargs["user"])
        return super()._create(model_class, *args, **kwargs)

    user = factory.SubFactory(UserFactory)
    course = factory.SubFactory(CourseFactory)


class CoordinatorFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Coordinator

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        if "user" in kwargs and "course" in kwargs:
            # handle whitelist
            if kwargs["course"].is_restricted:
                kwargs["course"].whitelist.add(kwargs["user"])
        return super()._create(model_class, *args, **kwargs)

    user = factory.SubFactory(UserFactory)
    course = factory.SubFactory(CourseFactory)


class SectionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Section

    capacity = factory.LazyFunction(lambda: random.randint(3, 6))
    waitlist_capacity = DEFAULT_WAITLIST_CAP

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        if "spacetimes" not in kwargs:
            spacetimes = SpacetimeFactory.create_batch(random.randint(1, 2))
            # We want to ensure that if there are 2 spacetimes for a section
            # that they are for different days of the week
            for spacetime, day in zip(
                spacetimes, random.sample(DayOfWeekField.DAYS, len(spacetimes))
            ):
                spacetime.day_of_week = day
                spacetime.save()
        else:
            spacetimes = kwargs.pop("spacetimes")
        obj = model_class.objects.create(*args, **kwargs)
        obj.spacetimes.set(spacetimes)
        obj.save()
        return obj


class SectionOccurrenceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = SectionOccurrence

    word_of_the_day = factory.LazyFunction(
        lambda: evaluate_faker(factory.Faker("word"))
    )


class AttendanceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Attendance

    presence = factory.fuzzy.FuzzyChoice(Attendance.Presence.values)
    student = factory.SubFactory(StudentFactory)


class OverrideFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Override

    @factory.lazy_attribute
    def date(self):
        """Override to be a random date"""
        date = evaluate_faker(
            factory.Faker(
                "date_between_dates",
                date_start=self.overriden_spacetime.section.mentor.course.enrollment_start.date(),
                date_end=self.overriden_spacetime.section.mentor.course.valid_until,
            )
        )
        return date + timedelta(
            days=(day_to_number(self.spacetime.day_of_week) - date.weekday())
        )

    spacetime = factory.SubFactory(SpacetimeFactory)


class WaitlistedStudentFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = WaitlistedStudent

    user = factory.SubFactory(UserFactory)
    section = factory.SubFactory(SectionFactory)

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Handles uniqueness and assigns position correctly."""
        waitlisted_student, _ = model_class.objects.get_or_create(**kwargs)
        return waitlisted_student


class ResourceFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Resource


def build_attendances_for(student):
    """
    Build attendance objects for the student, associated with each existing section occurrence.
    """
    today = timezone.datetime.today().date()
    section_start_week = week_bounds(student.course.section_start)[0]
    existing_attendance_dates = set(
        student.attendance_set.values_list("sectionOccurrence__date", flat=True)
    )
    attendance_objects = []
    for so in student.section.sectionoccurrence_set.all():
        date = so.date
        if (
            date < section_start_week
            or date >= student.course.valid_until
            or date in existing_attendance_dates
        ):
            continue
        week_start = week_bounds(date)[0]
        if week_start < today:
            attendance_objects.append(
                AttendanceFactory.build(student=student, sectionOccurrence=so)
            )
        else:
            # Students cannot have attended or not attended sections that haven't happened yet
            attendance_objects.append(
                AttendanceFactory.build(
                    student=student, sectionOccurrence=so, presence=""
                )
            )
    return attendance_objects


def build_spacetimes_occurrences_for(section, true_random_spacetimes=True):
    """
    Build spacetimes and section occurrences for this section.

    Section should be associated with a course that has a specified
    `section_start` and `valid_until` field.
    """

    spacetime_objects = []
    section_occurrence_objects = []

    # spacetimes for section; manually create because factory._create is not called
    num_spacetimes = random.choices([1, 2], [0.75, 0.25])[0]
    if true_random_spacetimes:
        # We want to ensure that if there are 2 spacetimes for a section
        # that they are for different days of the week
        spacetime_days = random.sample(DayOfWeekField.DAYS, num_spacetimes)
        for day in spacetime_days:
            spacetime_objects.append(
                SpacetimeFactory.build(section=section, day_of_week=day)
            )
    else:
        # use realistic choices for spacetimes
        if num_spacetimes == 1:
            # no weekends
            spacetime_days = [random.choice(DayOfWeekField.DAYS[:5])]
            spacetime_objects.append(
                SpacetimeFactory.build(section=section, day_of_week=spacetime_days[0])
            )
        else:
            # choose one of M/W, Tu/Th, W/F
            spacetime_days = random.choice(
                [
                    (DayOfWeekField.DAYS[0], DayOfWeekField.DAYS[2]),
                    (DayOfWeekField.DAYS[1], DayOfWeekField.DAYS[3]),
                    (DayOfWeekField.DAYS[2], DayOfWeekField.DAYS[4]),
                ]
            )
            for day in spacetime_days:
                spacetime_objects.append(
                    SpacetimeFactory.build(section=section, day_of_week=day)
                )

    current_date = week_bounds(section.mentor.course.section_start)[0]
    spacetime_day_numbers = [
        day_to_number(day_of_week) for day_of_week in spacetime_days
    ]
    # create section occurrences
    while current_date < section.mentor.course.valid_until:
        for spacetime_day in spacetime_day_numbers:
            date = current_date + timedelta(days=spacetime_day)
            section_occurrence_objects.append(
                SectionOccurrenceFactory.build(section=section, date=date)
            )
        current_date += timedelta(weeks=1)

    return spacetime_objects, section_occurrence_objects


def demoify_user(user, username):
    """Make the user an admin."""
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
    """
    Create a new demo account as:
    - student for one course's section
    - mentor for another course's section
    - coordinator for a third course
    - whitelist for three random restricted courses
    - coordinator for all the LARGE* courses

    Also create a new demo mentor account associated with a new course
    that the first demo_user account is a coordindator for.
    This last account would primarily be used for matcher testing,
    as 50 other mentors (not associated with any section) are created for this course.
    This demo mentor account will also be a mentor for a section in each of the LARGE* courses.
    """

    course_filter = [info[0] for info in COURSE_INFO]
    large_course_filter = [info[0] for info in LARGE_COURSE_INFO]

    # get a random mentor with 2 spacetimes
    demo_mentor = random.choice(
        Mentor.objects.annotate(Count("section__spacetimes")).filter(
            section__spacetimes__count=2,
            course__is_restricted=False,
            course__name__in=course_filter,
        )
    )
    demo_user = demo_mentor.user

    # associate it with a second section (take over another mentor)
    second_section = random.choice(
        Section.objects.filter(
            mentor__course=demo_mentor.course, mentor__course__is_restricted=False
        ).exclude(pk=demo_mentor.section.pk)
    )
    demo_mentor_2 = second_section.mentor
    demo_mentor_2.user = demo_user
    demo_mentor_2.save()

    # make user admin and change username
    demoify_user(demo_user, "demo_user")

    # associate user as student in another section (take over another student)
    demo_student = random.choice(
        Student.objects.filter(
            course__is_restricted=True, course__name__in=course_filter
        ).exclude(course=demo_mentor.course)
    )
    demo_student.user = demo_user
    demo_student.course.whitelist.add(demo_user)
    demo_student.save()

    # associate user as coordinator of another course (create a new coordinator)
    demo_coord = Coordinator.objects.create(
        user=demo_mentor.user,
        course=random.choice(
            Course.objects.filter(is_restricted=False, name__in=course_filter).exclude(
                pk__in=(demo_mentor.course.pk, demo_student.course.pk)
            )
        ),
    )

    # whitelist to a random selection of restricted courses
    restricted_courses = Course.objects.filter(
        is_restricted=True, name__in=course_filter
    )
    first_whitelist_course = random.choice(restricted_courses)
    second_whitelist_course = random.choice(
        restricted_courses.exclude(pk=first_whitelist_course.pk)
    )
    coord_whitelist_course = random.choice(
        restricted_courses.exclude(
            pk__in=(first_whitelist_course.pk, second_whitelist_course.pk)
        )
    )

    first_whitelist_course.whitelist.add(demo_user)
    second_whitelist_course.whitelist.add(demo_user)
    coord_whitelist_course.whitelist.add(demo_user)
    restricted_demo_coord = Coordinator.objects.create(
        user=demo_user, course=coord_whitelist_course
    )

    # associate user as coordinator to all of the large sections
    for large_course_name in large_course_filter:
        Coordinator.objects.create(
            user=demo_user, course=Course.objects.get(name=large_course_name)
        )

    print(
        """
    A demo account has been created with username 'demo_user' and password 'pass'
    Log in at localhost:8000/admin/
    """
    )

    # make demo_user a coord for one more course
    coord_2_whitelist_course = random.choice(
        Course.objects.exclude(
            pk__in=(
                demo_mentor.course.pk,
                demo_student.course.pk,
                demo_coord.course.pk,
                restricted_demo_coord.course.pk,
            )
        ).filter(name__in=course_filter)
    )
    demo_coord_2 = Coordinator.objects.create(
        user=demo_mentor.user, course=coord_2_whitelist_course
    )
    # delete all mentors associated with the second course
    Mentor.objects.filter(course=demo_coord_2.course).delete()
    # create new mentors associated with demo coord's course
    mentors = MentorFactory.create_batch(50, course=demo_coord_2.course)

    # allow one mentor to login through admin menu
    demo_mentor_user = mentors[0].user
    demoify_user(demo_mentor_user, "demo_mentor")

    # associate the same user as a mentor for all the large courses (take over a mentor)
    for large_course_name in large_course_filter:
        large_course_section = random.choice(
            Section.objects.filter(mentor__course__name=large_course_name)
        )
        large_course_section.mentor.user = demo_mentor_user

    print(
        """
    A demo mentor has been created with username 'demo_mentor' and password 'pass'
    Log in at localhost:8000/admin/
    """
    )


def confirm_run():
    """Display warning message for user to confirm flushing the database."""
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
    """Generate random test data."""
    if settings.DJANGO_ENV == settings.PRODUCTION:
        print("This cannot be run in production! Aborting.")
        return
    if not preconfirm and not confirm_run():
        return
    management.call_command("flush", interactive=False)

    print("Generating test data...")
    _start_time = time.perf_counter_ns()

    enrollment_start = timezone.now() - timedelta(days=14)
    enrollment_end = timezone.now() + timedelta(days=50)
    valid_until = timezone.now() + timedelta(days=100)

    user_objects = []
    course_objects = []
    mentor_objects = []
    section_objects = []
    spacetime_objects = []
    section_occurrence_objects = []
    student_objects = []
    waitlisted_student_objects = []

    print("Creating model instances... ", end="")
    _create_models_start = time.perf_counter_ns()
    for course_name, course_title, course_restricted in COURSE_INFO:
        course = CourseFactory.build(
            name=course_name,
            title=course_title,
            enrollment_start=enrollment_start,
            enrollment_end=enrollment_end,
            valid_until=valid_until,
            is_restricted=course_restricted,
        )
        course_objects.append(course)

        # sections for this course
        for _ in range(random.randint(5, 10)):
            mentor_user = UserFactory.build()
            user_objects.append(mentor_user)
            mentor = MentorFactory.build(course=course, user=mentor_user)
            mentor_objects.append(mentor)
            section = SectionFactory.build(mentor=mentor)
            section_objects.append(section)

            # create spacetimes and section occurrences
            cur_spacetimes, cur_section_occurrences = build_spacetimes_occurrences_for(
                section, true_random_spacetimes=True
            )
            spacetime_objects.extend(cur_spacetimes)
            section_occurrence_objects.extend(cur_section_occurrences)

            # create students for the section
            student_users = UserFactory.build_batch(random.randint(0, section.capacity))
            user_objects.extend(student_users)
            students = []
            for student_user in student_users:
                students.append(
                    StudentFactory.build(
                        section=section, course=course, user=student_user
                    )
                )
            student_objects.extend(students)

            if len(student_users) >= section.capacity:
                waitlisted_users = UserFactory.build_batch(
                    random.randint(0, section.waitlist_capacity)
                )
                user_objects.extend(waitlisted_users)
                waitlisted_students = []
                for waitlisted_user in waitlisted_users:
                    waitlisted_students.append(
                        WaitlistedStudentFactory.build(
                            section=section, course=course, user=waitlisted_user
                        )
                    )
                waitlisted_student_objects.extend(waitlisted_students)

    # courses with many sections/students
    for (
        course_name,
        course_title,
        (min_sections, max_sections),
        (min_students, max_students),
    ) in LARGE_COURSE_INFO:
        course = CourseFactory.build(
            name=course_name,
            title=course_title,
            enrollment_start=enrollment_start,
            enrollment_end=enrollment_end,
            valid_until=valid_until,
            is_restricted=False,
        )
        course_objects.append(course)

        # sections for this course
        for _ in range(random.randint(min_sections, max_sections)):
            mentor_user = UserFactory.build()
            user_objects.append(mentor_user)
            mentor = MentorFactory.build(course=course, user=mentor_user)
            mentor_objects.append(mentor)
            section = SectionFactory.build(
                mentor=mentor, capacity=random.randint(min_students, max_students)
            )
            section_objects.append(section)

            # create spacetimes and section occurrences; use realistic spacetimes as well
            cur_spacetimes, cur_section_occurrences = build_spacetimes_occurrences_for(
                section, true_random_spacetimes=False
            )
            spacetime_objects.extend(cur_spacetimes)
            section_occurrence_objects.extend(cur_section_occurrences)

            # create students for the section
            student_users = UserFactory.build_batch(
                random.randint(min_students, section.capacity)
            )
            user_objects.extend(student_users)
            students = []
            for student_user in student_users:
                students.append(
                    StudentFactory.build(
                        section=section, course=course, user=student_user
                    )
                )
            student_objects.extend(students)

    print(f"({(time.perf_counter_ns() - _create_models_start)/1e6:.6f} ms)")

    # randomize the order of object creation
    random.shuffle(user_objects)
    random.shuffle(course_objects)
    random.shuffle(mentor_objects)
    random.shuffle(section_objects)
    random.shuffle(spacetime_objects)
    random.shuffle(section_occurrence_objects)
    random.shuffle(student_objects)
    random.shuffle(waitlisted_student_objects)

    print("Saving models to database... ", end="")
    _save_models_start = time.perf_counter_ns()

    User.objects.bulk_create(user_objects)
    Course.objects.bulk_create(course_objects)
    Mentor.objects.bulk_create(mentor_objects)
    Section.objects.bulk_create(section_objects)
    Spacetime.objects.bulk_create(spacetime_objects)
    SectionOccurrence.objects.bulk_create(section_occurrence_objects)
    Student.objects.bulk_create(student_objects)
    WaitlistedStudent.objects.bulk_create(waitlisted_student_objects)

    print(f"({(time.perf_counter_ns() - _save_models_start)/1e6:.6f} ms)")

    # reload students, fetching related fields to optimize attendance creation
    prefetched_student_objects = Student.objects.select_related(
        "section", "course"
    ).prefetch_related(
        "section__sectionoccurrence_set",
        "attendance_set__sectionoccurrence",
    )

    print("Generating attendances... ", end="")
    _generate_attendances_start = time.perf_counter_ns()

    attendance_objects = []
    for student in prefetched_student_objects:
        attendance_objects.extend(build_attendances_for(student))

    # shuffle attendance objects
    random.shuffle(attendance_objects)

    # create attendance objects
    Attendance.objects.bulk_create(attendance_objects)

    print(f"({(time.perf_counter_ns() - _generate_attendances_start)/1e6:.6f} ms)")

    print("Generating resources... ", end="")
    _generate_resources_start = time.perf_counter_ns()

    resource_objects = []
    for course in course_objects:
        # don't create resources for restricted courses
        if course.is_restricted:
            continue
        for i in range(random.randint(3, 5)):
            date = enrollment_start + timedelta(days=7 * i)
            val = random.randint(1, 100)
            resource_objects.append(
                ResourceFactory.build(
                    course=course, week_num=i + 1, date=date, topics=f"Topic {val}"
                )
            )

    # randomize resource objects
    random.shuffle(resource_objects)

    # create resource objects
    Resource.objects.bulk_create(resource_objects)

    print(f"({(time.perf_counter_ns() - _generate_resources_start)/1e6:.6f} ms)")

    print(f"Done. ({(time.perf_counter_ns() - _start_time)/1e6:.6f} ms)\n")

    create_demo_account()
