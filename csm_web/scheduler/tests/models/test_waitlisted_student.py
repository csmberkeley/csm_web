# import pytest
# from django.core.exceptions import ValidationError
# from scheduler.factories import (
#     CourseFactory,
#     MentorFactory,
#     SectionFactory,
#     StudentFactory,
#     UserFactory,
# )
# from scheduler.models import Student, User, WaitlistedStudent

# @pytest.mark.django_db
# def test_add_waitlist():
#     mentor_user, student_user, waitlist_user = UserFactory.create_batch(3)
#     course = CourseFactory.create()
#     mentor = MentorFactory.create(course=course, user=mentor_user)
#     section = SectionFactory.create(mentor=mentor, capacity=1, waitlist_capacity=1)
#     student = Student.objects.create(user=student_user, course=course, section=section)
