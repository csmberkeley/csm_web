from django.test import TestCase

from scheduler.models import Profile
from .utils import gen_test_data


class TestDatabaseSanity(TestCase):
    @classmethod
    def setUpTestData(cls):
        gen_test_data(cls)

    def test_leader_existences(self):
        """
		Checks that every Profile has the appropriate leader, as follows:
		- all Students should have a JM, SM, or coord as leader; this leader must be the same
		  as their section's leader
		- all JMs should have an SM or coord as leader
		- all SMs should have a coord as leader
		- all coords should have no leader
		Furthermore, every step of the leadership chain should have the same course property.
		"""
        # it's sufficient to start from students since we'll be checking higher-ups recursively
        def check_student_leader(student):
            course = student.course
            self.assertIsNotNone(student.section)
            self.assertEqual(course, student.section.course)
            leader = student.leader
            self.assertEqual(leader, student.section.leader)
            if leader.role == Profile.JUNIOR_MENTOR:
                check_jm_leader(leader, course)
            elif leader.role == Profile.SENIOR_MENTOR:
                check_sm_leader(leader, course)
            elif leader.role == Profile.COORDINATOR:
                check_coord_leader(leader, course)
            else:
                self.assertTrue(False, msg="student had non-mentor in leader role")

        def check_jm_leader(jm, course=None):
            jm_course = jm.course
            if course is not None:
                self.assertEqual(jm_course, course)
            leader = jm.leader
            if leader.role == Profile.SENIOR_MENTOR:
                check_sm_leader(leader, course)
            elif leader.role == Profile.COORDINATOR:
                check_coord_leader(leader, course)
            else:
                self.assertTrue(False, msg="JM leader must be SM or coord")

        def check_sm_leader(sm, course=None):
            if course is not None:
                self.assertEqual(sm.course, course)
            self.assertEqual(sm.leader.role, Profile.COORDINATOR)
            check_coord_leader(sm.leader, course)

        def check_coord_leader(coord, course=None):
            if course is not None:
                self.assertEqual(coord.course, course)
            self.assertIsNone(coord.leader)

        [check_student_leader(s) for s in self.students]
