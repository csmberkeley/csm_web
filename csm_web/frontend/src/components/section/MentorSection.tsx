import React from "react";
import { Routes, Route } from "react-router-dom";

import { Mentor, Role, Spacetime } from "../../utils/types";
import MentorSectionAttendance from "./MentorSectionAttendance";
import MentorSectionInfo from "./MentorSectionInfo";
import MentorSectionRoster from "./MentorSectionRoster";
import { SectionDetail } from "./Section";

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
  waitlistCapacity: number;
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
  mentor,
  waitlistCapacity
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
              isCoordinator={userRole === Role.COORDINATOR}
              mentor={mentor}
              spacetimes={spacetimes}
              capacity={capacity}
              description={description}
              id={id}
              courseRestricted={courseRestricted}
              waitlistCapacity={waitlistCapacity}
            />
          }
        />
      </Routes>
    </SectionDetail>
  );
}
