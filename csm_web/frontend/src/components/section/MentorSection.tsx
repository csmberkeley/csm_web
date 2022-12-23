import React from "react";
import { Mentor, Spacetime } from "../../utils/types";
import { SectionDetail, ROLES } from "./Section";
import { Routes, Route } from "react-router-dom";
import MentorSectionAttendance from "./MentorSectionAttendance";
import MentorSectionRoster from "./MentorSectionRoster";
import MentorSectionInfo from "./MentorSectionInfo";

interface MentorSectionProps {
  id: number;
  course: string;
  courseTitle: string;
  spacetimes: Spacetime[];
  userRole: string;
  mentor: Mentor;
  capacity: number;
  description: string;
  courseRestricted: boolean;
}

export default function MentorSection({
  id,
  course,
  courseRestricted,
  courseTitle,
  spacetimes,
  capacity,
  description,
  userRole,
  mentor
}: MentorSectionProps) {
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
        <Route path="attendance" element={<MentorSectionAttendance sectionId={id} />} />
        <Route path="roster" element={<MentorSectionRoster id={id} />} />
        <Route
          index
          element={
            <MentorSectionInfo
              isCoordinator={userRole === ROLES.COORDINATOR}
              mentor={mentor}
              spacetimes={spacetimes}
              capacity={capacity}
              description={description}
              id={id}
              courseRestricted={courseRestricted}
            />
          }
        />
      </Routes>
    </SectionDetail>
  );
}
