from rest_framework.reverse import reverse
from scheduler.factories import create_attendances_for
from scheduler.models import Profile, Attendance
from scheduler.tests.utils import gen_test_data, APITestCase, random_objs, rand_date


class TestAttendancePerms(APITestCase):
    """
    Tests permissions on the /attendances and /attendances/<int:pk> endpoints.
    """

    CREATE_ATTENDANCE = reverse("create-attendance")
    ALLOWED_METHODS = {CREATE_ATTENDANCE: ("POST",)}

    @classmethod
    def setUpTestData(cls):
        gen_test_data(cls)

    def test_attendance_create(self):
        """
        Tests that the only user allowed to create attendances by this endpoint
        is the mentor of the student.
        """
        # Clear all attendances so we can safely create more
        Attendance.objects.all().delete()
        for role in Profile.ROLE_MAP:
            if role == Profile.COORDINATOR:
                continue
            profile = Profile.objects.filter(role=role).first()
            section = profile.section
            get_data = lambda st: {
                "section": st.section.id,
                # Generate a random time between today and 10 days in the future
                "date": rand_date(),
                "presence": Attendance.PRESENT,
                "attendee": st.id,
            }
            client = self.get_client_for(profile.user)
            if role == Profile.STUDENT:
                self.req_fails_perms(
                    client, "POST", self.CREATE_ATTENDANCE, data=get_data(profile)
                )
            else:
                for st in section.active_students:
                    self.req_succeeds(
                        client, "POST", self.CREATE_ATTENDANCE, data=get_data(st)
                    )
                # Should be unable to update attendances of everyone but their students
                # (We don't care if they can create an attendance for themselves as mentors)
                not_students = Profile.objects.exclude(
                    id__in=[st.id for st in section.students] + [profile.id]
                )
                for st in not_students[:20]:
                    # Prevents encounters with the pigeonhole principle, where we attempt to
                    # generate an attendance on the same day/student as one that already exists
                    # Without the filter statement, the request would return 400; the fact that
                    # it does not return 403 is technically a violation of spec, but we don't
                    # care enough about this trivial information leakage of the fact that an attendance
                    # at a given date and user profile exists, and it quite frankly is unimportant.
                    if st.section and not Attendance.objects.filter(attendee=st.id):
                        self.req_fails_perms(
                            client, "POST", self.CREATE_ATTENDANCE, data=get_data(st)
                        )

    def test_attendance_update(self):
        """
        Tests that the only user allowed to update attendances by this endpoint
        is the mentor of the student.
        """
        Attendance.objects.all().delete()
        get_data = lambda st: {
            # Generate a random time between today and 10 days in the future
            "presence": Attendance.PRESENT
        }
        for student in Profile.objects.filter(role=Profile.STUDENT)[0:10]:
            create_attendances_for(student)
            attendance = Attendance.objects.filter(attendee=student).first()
            update_attendance = reverse(
                "update-attendance", kwargs={"pk": attendance.pk}
            )
            mentor = student.leader
            not_mentor = Profile.objects.exclude(id=mentor.id).first()
            data = get_data(student)
            mentor_client = self.get_client_for(mentor.user)
            self.req_succeeds(mentor_client, "PATCH", update_attendance, data=data)
            not_mentor_client = self.get_client_for(not_mentor.user)
            self.req_fails_perms(
                not_mentor_client, "PATCH", update_attendance, data=data
            )
            own_client = self.get_client_for(student.user)
            self.req_fails_perms(own_client, "PATCH", update_attendance, data=data)
