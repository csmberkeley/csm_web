from datetime import datetime

from django.core.management import BaseCommand
from scheduler.models import Section, Student


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument("start-date", help="start date, in the form yyyy-mm-dd")
        parser.add_argument("end-date", help="end date, in the form yyyy-mm-dd")

    def handle(self, *args, **options):
        start, end = options["start-date"], options["end-date"]
        start, end = datetime.strptime(start, "%Y-%m-%d"), datetime.strptime(
            end, "%Y-%m-%d"
        )
        self._check_attendance_sets(start, end)
        self._check_attendance_sections(start, end)

    def _check_attendance_sets(self, start, end):
        print("checking attendance section enrollment...")
        sections = Section.objects.prefetch_related("sectionoccurrence_set")
        for section in sections:
            # only get active students (these will be shown to the mentor)
            enrolled_student_objs = section.students.filter(active=True)
            enrolled = set(enrolled_student_objs.values_list("id", flat=True))
            for so in section.sectionoccurrence_set.filter(
                date__gte=start, date__lte=end
            ).prefetch_related("attendance_set__student"):
                # print(so.attendance_set.values_list('student').first())
                so_students = set(so.attendance_set.values_list("student", flat=True))
                if enrolled != so_students:
                    print(f"Incorrect for section (id {section.pk}) {section}")
                    print(f"\tenrolled: ids {enrolled}\n\t\t{enrolled_student_objs}")
                    print(
                        f"\tattendance ({so.date}): ids {so_students}\n\t\t{Student.objects.filter(id__in=so_students)}"
                    )

    def _check_attendance_sections(self, start, end):
        print("checking section occurrence sections...")
        for student in Student.objects.all():
            section = student.section
            for attendance in (
                student.attendance_set.filter(
                    sectionOccurrence__date__gte=start, sectionOccurrence__date__lte=end
                )
                .prefetch_related("sectionOccurrence__section")
                .select_related("sectionOccurrence")
            ):
                att_so = attendance.sectionOccurrence
                att_so_section = att_so.section
                # get the section occurrence for the section on the same date
                expected_so = section.sectionoccurrence_set.get(date=att_so.date)
                if att_so_section != student.section:
                    print(
                        f"Incorrect for student (id {student.pk}) {student}, attendance (id {attendance.pk}) {attendance}"
                    )
                    print(
                        f"\tgot (id {att_so_section.pk}) {att_so_section}\n\t\texpected (id {section.pk}) {section}"
                    )
                    print(
                        f"\tSectionOccurrence (id {att_so.pk}) {att_so}\n\t\texpected (id {expected_so.pk}) {expected_so}"
                    )
