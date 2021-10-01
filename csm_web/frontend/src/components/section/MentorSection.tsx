import React, { useState, useEffect } from "react";
import { fetchJSON } from "../../utils/api";
import { Attendance, Mentor, Spacetime, Student } from "../../utils/types";
import { SectionDetail, ROLES } from "./Section";
import { Switch, Route } from "react-router-dom";
import { groupBy } from "lodash";
import MentorSectionAttendance from "./MentorSectionAttendance";
import MentorSectionRoster from "./MentorSectionRoster";
import MentorSectionInfo from "./MentorSectionInfo";

interface MentorSectionProps {
  id: number;
  course: string;
  courseTitle: string;
  spacetimes: Spacetime[];
  url: string;
  reloadSection: () => void;
  userRole: string;
  mentor: Mentor;
  capacity: number;
  description: string;
}

interface MentorSectionState {
  students: Student[];
  attendances: {
    [date: string]: Attendance[];
  };
  loaded: boolean;
  loaded_progress: number;
}

type ResponseAttendance = {
  studentId: number;
  studentName: string;
} & Attendance;

export default function MentorSection({
  id,
  url,
  course,
  courseTitle,
  spacetimes,
  capacity,
  description,
  reloadSection,
  userRole,
  mentor
}: MentorSectionProps) {
  const [{ students, attendances, loaded_progress, loaded }, setState] = useState<MentorSectionState>({
    students: [],
    attendances: {},
    loaded: false,
    loaded_progress: 0
  });
  useEffect(() => {
    setState({ students: [], attendances: {}, loaded: false, loaded_progress: 0 });
    fetchJSON(`/sections/${id}/students/`).then(data => {
      const students: Student[] = data
        .map(({ name, email, id }: Student) => ({ name, email, id }))
        .sort((stu1: Student, stu2: Student) => stu1.name.toLowerCase().localeCompare(stu2.name.toLowerCase()));
      setState(state => {
        return {
          students,
          attendances: state.attendances,
          loaded: state.loaded_progress == 1,
          loaded_progress: state.loaded_progress + 1
        };
      });
    });
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
      setState(state => {
        return {
          students: state.students,
          attendances,
          loaded: state.loaded_progress == 1,
          loaded_progress: state.loaded_progress + 1
        };
      });
    });
  }, [id]);

  const updateAttendance = (updatedDate: string | undefined, updatedDateAttendances: Attendance[]) => {
    const updatedAttendances = Object.fromEntries(
      Object.entries(attendances).map(([date, dateAttendances]) => [
        date,
        date == updatedDate ? [...updatedDateAttendances] : dateAttendances
      ])
    );
    setState(state => ({
      ...state,
      attendances: updatedAttendances
    }));
  };

  return (
    <SectionDetail
      course={course}
      courseTitle={courseTitle}
      userRole={userRole}
      links={[
        ["Section", url],
        ["Attendance", `${url}/attendance`],
        ["Roster", `${url}/roster`]
      ]}
    >
      <Switch>
        <Route
          path={`${url}/attendance`}
          render={() => (
            <MentorSectionAttendance attendances={attendances} loaded={loaded} updateAttendance={updateAttendance} />
          )}
        />
        <Route path={`${url}/roster`} render={() => <MentorSectionRoster students={students} loaded={loaded} />} />
        <Route
          path={url}
          render={() => (
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
          )}
        />
      </Switch>
    </SectionDetail>
  );
}
