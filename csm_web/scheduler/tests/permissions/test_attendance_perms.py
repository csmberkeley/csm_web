from rest_framework.reverse import reverse
from scheduler.models import Profile, Attendance
from scheduler.tests.utils import gen_test_data, APITestCase, random_objs
from django.utils import timezone


class TestAttendancePerms(APITestCase):
    """
    Tests permissions on the /attendances and /attendances/<int:pk> endpoints.
    """

    CREATE_ATTENDANCE = reverse("create-attendance")
    UPDATE_ATTENDANCE = reverse("update-attendance", kwargs={"pk": 0})
    ALLOWED_METHODS = {CREATE_ATTENDANCE: set("POST"), UPDATE_ATTENDANCE: set("PATCH")}

    @classmethod
    def setUpTestData(cls):
        gen_test_data(cls)

    def test_attendance_create(self):
        """
        Tests that the only user allowed to create attendances by this endpoint
        is the mentor of the student.
        """
        for role in Profile.ROLE_MAP:
            profile = Profile.objects.filter(role=role).first()
            section = profile.section
            client = self.get_client_for(profile.user)
            if role == Profile.STUDENT:
                self.req_fails_perms("POST", self.CREATE_ATTENDANCE)
            else:
                get_data = lambda st: {
                    "section": st.section.id,
                    "week_start": timezone.now().date(),
                    "presence": Attendance.PRESENT,
                    "attendee": st.id,
                }
                for st in section.active_students:
                    self.req_succeeds("POST", self.CREATE_ATTENDANCE, data=get_data(st))
                not_students = Profile.objects.exclude(section.students)
                for st in not_students[:10]:
                    self.req_fails("POST", self.CREATE_ATTENDANCE, data=get_data(st))

    def test_attendance_update(self):
        """
        Tests that the only user allowed to update attendances by this endpoint
        is the mentor of the student.
        """
        pass
