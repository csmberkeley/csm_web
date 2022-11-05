import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useDropUserMutation, useStudentAttendances } from "../../utils/queries/sections";
import { Mentor, Override, Spacetime } from "../../utils/types";
import Modal from "../Modal";
import { ATTENDANCE_LABELS, InfoCard, ROLES, SectionDetail, SectionSpacetime } from "./Section";

import XIcon from "../../../static/frontend/img/x.svg";
import LoadingSpinner from "../LoadingSpinner";

interface StudentSectionType {
  course: string;
  courseTitle: string;
  mentor: Mentor;
  spacetimes: Spacetime[];
  override?: Override;
  associatedProfileId: number;
}

export default function StudentSection({
  course,
  courseTitle,
  mentor,
  spacetimes,
  override,
  associatedProfileId
}: StudentSectionType) {
  return (
    <SectionDetail
      course={course}
      courseTitle={courseTitle}
      userRole={ROLES.STUDENT}
      links={[
        ["Section", ""],
        ["Attendance", "attendance"]
      ]}
    >
      <Routes>
        <Route path="attendance" element={<StudentSectionAttendance associatedProfileId={associatedProfileId} />} />
        <Route
          index
          element={
            <StudentSectionInfo
              mentor={mentor}
              spacetimes={spacetimes}
              override={override}
              associatedProfileId={associatedProfileId}
            />
          }
        />
      </Routes>
    </SectionDetail>
  );
}

interface StudentSectionInfoProps {
  mentor: Mentor;
  spacetimes: Spacetime[];
  override?: Override;
  associatedProfileId: number;
}

// eslint-disable-next-line no-unused-vars
function StudentSectionInfo({ mentor, spacetimes, override, associatedProfileId }: StudentSectionInfoProps) {
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">My Section</h3>
      <div className="section-info-cards-container">
        {mentor && (
          <InfoCard title="Mentor">
            <h5>{mentor.name}</h5>
            <a href={`mailto:${mentor.email}`}>{mentor.email}</a>
          </InfoCard>
        )}
        {spacetimes.map(({ override, ...spacetime }, index) => (
          <SectionSpacetime
            manySpacetimes={spacetimes.length > 1}
            index={index}
            key={spacetime.id}
            spacetime={spacetime}
            override={override}
          />
        ))}
        <DropSection profileId={associatedProfileId} />
      </div>
    </React.Fragment>
  );
}

interface DropSectionProps {
  profileId: number;
}

enum DropSectionStage {
  INITIAL = "INITIAL",
  CONFIRM = "CONFIRM",
  DROPPED = "DROPPED"
}

function DropSection({ profileId }: DropSectionProps) {
  const studentDropMutation = useDropUserMutation(profileId);
  const [stage, setStage] = useState<DropSectionStage>(DropSectionStage.INITIAL);

  const performDrop = () => {
    studentDropMutation.mutate(undefined, {
      onSuccess: () => {
        setStage(DropSectionStage.DROPPED);
      }
    });
  };

  switch (stage) {
    case DropSectionStage.INITIAL:
      return (
        <InfoCard title="Drop Section" showTitle={false}>
          <h5>Drop Section</h5>
          <button className="danger-btn" onClick={() => setStage(DropSectionStage.CONFIRM)}>
            <XIcon height="1.3em" width="1.3em" />
            Drop
          </button>
        </InfoCard>
      );
    case DropSectionStage.CONFIRM:
      return (
        <Modal className="drop-confirmation" closeModal={() => setStage(DropSectionStage.INITIAL)}>
          <h5>Are you sure you want to drop?</h5>
          <p>You are not guaranteed an available spot in another section!</p>
          <button className="danger-btn" onClick={performDrop}>
            Confirm
          </button>
        </Modal>
      );
    case DropSectionStage.DROPPED:
      return <Navigate to="/" />;
  }
}

interface StudentSectionAttendanceProps {
  associatedProfileId: number;
}

function StudentSectionAttendance({ associatedProfileId }: StudentSectionAttendanceProps) {
  const { data: attendances, isSuccess: attendancesLoaded, isError: attendancesLoadError } = useStudentAttendances(
    associatedProfileId
  );

  return attendancesLoaded ? (
    <table id="attendance-table" className="standalone-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {attendances.map(({ presence, date }) => {
          const [label, cssSuffix] = ATTENDANCE_LABELS[presence];
          return (
            <tr key={date}>
              <td>{date}</td>
              <td className="status">
                <div style={{ backgroundColor: `var(--csm-attendance-${cssSuffix})` }}>{label}</div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  ) : attendancesLoadError ? (
    <h3>Attendances could not be loaded</h3>
  ) : (
    <LoadingSpinner className="spinner-centered" />
  );
}
