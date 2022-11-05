import React, { useState, useEffect } from "react";
import { Attendance, Mentor, RawAttendance, Spacetime } from "../../utils/types";
import { SectionDetail, ROLES } from "./Section";
import { Routes, Route } from "react-router-dom";
import { groupBy } from "lodash";
import MentorSectionAttendance from "./MentorSectionAttendance";
import MentorSectionRoster from "./MentorSectionRoster";
import MentorSectionInfo from "./MentorSectionInfo";
import { useSectionAttendances } from "../../utils/queries/sections";

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

type GroupedAttendances = {
  [date: string]: Attendance[];
};

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
  const { data: jsonAttendances, isSuccess: jsonAttendancesLoaded } = useSectionAttendances(id);
  const [attendances, setAttendances] = useState<GroupedAttendances>(undefined as never);

  useEffect(() => {
    if (jsonAttendancesLoaded) {
      const groupedAttendances = groupBy(
        jsonAttendances.flatMap(({ attendances }: RawAttendance) =>
          attendances
            .map(
              ({ id, presence, date, studentId, studentName, studentEmail }) =>
                ({
                  id,
                  presence,
                  date,
                  student: { id: studentId, name: studentName, email: studentEmail }
                } as any)
            )
            .sort((att1, att2) => att1.student.name.toLowerCase().localeCompare(att2.student.name.toLowerCase()))
        ),
        attendance => attendance.date
      ) as any;
      setAttendances(groupedAttendances);
    }
  }, [jsonAttendances]);

  const updateAttendance = (updatedDate: string | undefined, updatedDateAttendances: Attendance[]) => {
    const updatedAttendances = Object.fromEntries(
      Object.entries(attendances).map(([date, dateAttendances]) => [
        date,
        date == updatedDate ? [...updatedDateAttendances] : dateAttendances
      ])
    );
    setAttendances(updatedAttendances);
  };

  const attendancesLoaded = jsonAttendancesLoaded && !!attendances;

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
            <MentorSectionAttendance
              attendances={attendances}
              sectionId={id}
              loaded={attendancesLoaded}
              updateAttendance={updateAttendance}
            />
          }
        />
        <Route path="roster" element={<MentorSectionRoster id={id} />} />
        <Route
          index
          element={
            <MentorSectionInfo
              isCoordinator={userRole === ROLES.COORDINATOR}
              mentor={mentor}
              reloadSection={reloadSection}
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
