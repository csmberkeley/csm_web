import React, { useState, useEffect } from "react";
import { fetchJSON } from "../../utils/api";
import { Attendance, Mentor, Spacetime, Student } from "../../utils/types";
import { SectionDetail, ROLES } from "./Section";
import { Routes, Route } from "react-router-dom";
import { groupBy } from "lodash";
import MentorSectionAttendance from "./MentorSectionAttendance";
import MentorSectionRoster from "./MentorSectionRoster";
import MentorSectionInfo from "./MentorSectionInfo";

interface MentorSectionProps {
  id: number;
  course: string;
  courseTitle: string;
  spacetimes: Spacetime[];
  reloadSection: () => void;
  userRole: string;
  mentor: Mentor;
  capacity: number;
  description: string;
}

type ResponseAttendance = {
  studentId: number;
  studentName: string;
} & Attendance;

export default function MentorSection({
  id,
  course,
  courseTitle,
  spacetimes,
  capacity,
  description,
  reloadSection,
  userRole,
  mentor
}: MentorSectionProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendances, setAttendances] = useState<{
    [date: string]: Attendance[];
  }>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchJSON(`/sections/${id}/students/`).then(data => {
        const students: Student[] = data
          .map(({ name, email, id }: Student) => ({ name, email, id }))
          .sort((stu1: Student, stu2: Student) => stu1.name.toLowerCase().localeCompare(stu2.name.toLowerCase()));
        setStudents(students);
      }),
      fetchJSON(`/sections/${id}/attendance`).then(data => {
        const attendances = groupBy(
          data.flatMap(({ attendances }: { attendances: ResponseAttendance[] }) =>
            attendances
              .map(({ id, presence, date, studentName, studentId }) => ({
                id,
                presence,
                date,
                student: { name: studentName, id: studentId }
              }))
              .sort((att1, att2) => att1.student.name.toLowerCase().localeCompare(att2.student.name.toLowerCase()))
          ),
          attendance => attendance.date
        );
        setAttendances(attendances);
      })
    ]).then(() => {
      setLoaded(true);
    });
  }, [id]);

  const updateAttendance = (updatedDate: string | undefined, updatedDateAttendances: Attendance[]) => {
    const updatedAttendances = Object.fromEntries(
      Object.entries(attendances).map(([date, dateAttendances]) => [
        date,
        date == updatedDate ? [...updatedDateAttendances] : dateAttendances
      ])
    );
    setAttendances(updatedAttendances);
  };

  return (
    <SectionDetail
      course={course}
      courseTitle={courseTitle}
      userRole={userRole}
      links={[
        ["Section", ""],
        ["Attendance", "attendance"],
        ["Roster", "roster"]
      ]}
    >
      <Routes>
        <Route
          path="attendance"
          element={
            <MentorSectionAttendance attendances={attendances} loaded={loaded} updateAttendance={updateAttendance} />
          }
        />
        <Route path="roster" element={<MentorSectionRoster students={students} loaded={loaded} />} />
        <Route
          index
          element={
            <MentorSectionInfo
              isCoordinator={userRole === ROLES.COORDINATOR}
              mentor={mentor}
              reloadSection={reloadSection}
              students={students}
              loaded={loaded}
              spacetimes={spacetimes}
              capacity={capacity}
              description={description}
              id={id}
            />
          }
        />
      </Routes>
    </SectionDetail>
  );
}
