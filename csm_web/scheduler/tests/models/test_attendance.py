import pytest
from scheduler.models import User, Course


@pytest.mark.django_db
def test_user_create():
    mentor_email = "JohnnyAppleseed@berkeley.edu"
    User.objects.get_or_create(email=mentor_email, username=mentor_email.split('@')[0])
    assert User.objects.count() == 1


@pytest.fixture
def create_users(db, django_user_model):
    i = 0

    def make_users(number_of_users):
        users = []
        for j in range(number_of_users):
            user_email = "user_" + str(i).rjust(3, "0")
            user, _ = User.objects.get_or_create(email=user_email, username=user_email.split('@')[0])
            users.append(user)
            i = i + 1
        return users
    return make_users


"""
    - Create course
    - 2 sections with capacity 6
    - 2 mentors teaching different days
    - 4 students per section
    return
        'courses': [course_id]

"""


@pytest.fixture
def create_attendance_test_data(db):
    def make_attendance_test_data(course_num, section_num, capacity, student_num):
        courses, sections, mentors, students = [], [], [], []
        for course_id in range(course_num):
            course_name = "course_" + str(course_id).rjust(2, "0")
            C = Course(name=course_name, title=course_name)
            C.save()
            courses.append(C)
        return courses
    return make_attendance_test_data

# TODO: add student to section -> new SO/attendance creates


def test_attendance_add_student_to_section(create_attendance_test_data):
    Cs = create_attendance_test_data(1, 1, 1, 1)

# TODO: student drop -> extra attendance/SO deleted
