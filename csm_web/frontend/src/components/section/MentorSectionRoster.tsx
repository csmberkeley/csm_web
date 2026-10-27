import React, { useState } from "react";

import { useSectionStudents, useSectionWaitlistedStudents } from "../../utils/queries/sections";
import LoadingSpinner from "../LoadingSpinner";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import CopyIcon from "../../../static/frontend/img/copy.svg";

interface MentorSectionRosterProps {
  id: number;
}

export default function MentorSectionRoster({ id }: MentorSectionRosterProps) {
  const { data: students, isSuccess: studentsLoaded, isError: studentsLoadError } = useSectionStudents(id);
  const [emailsCopied, setEmailsCopied] = useState(false);
  const {
    data: wlStudents,
    isSuccess: wlStudentsLoaded,
    isError: wlStudentsLoadError
  } = useSectionWaitlistedStudents(id);
  const [wlEmailsCopied, wlSetEmailsCopied] = useState(false);

  const handleCopyEmails = () => {
    if (studentsLoaded) {
      navigator.clipboard.writeText(students.map(({ email }) => email).join("\n")).then(() => {
        setEmailsCopied(true);
        setTimeout(() => setEmailsCopied(false), 1500);
      });
    }
  };
  const wlHandleCopyEmails = () => {
    if (wlStudentsLoaded) {
      navigator.clipboard.writeText(wlStudents.map(({ email }) => email).join("\n")).then(() => {
        wlSetEmailsCopied(true);
        setTimeout(() => wlSetEmailsCopied(false), 1500);
      });
    }
  };
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">Roster</h3>
      {studentsLoaded ? (
        <table className="csm-table standalone">
          <thead className="csm-table-head">
            <tr className="csm-table-head-row">
              <th className="csm-table-item">Name</th>
              <th className="csm-table-item">Email</th>
              <th className="csm-table-item">
                <CopyIcon id="copy-student-emails" height="1em" width="1em" onClick={handleCopyEmails} />
                {emailsCopied && <CheckCircle id="copy-student-emails-success" height="1em" width="1em" />}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map(({ name, email, id }) => (
              <tr key={id} className="csm-table-row">
                <td className="csm-table-item">{name}</td>
                <td className="csm-table-item">{email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : studentsLoadError ? (
        <h3>Students could not be loaded</h3>
      ) : (
        <LoadingSpinner />
      )}
      {wlStudentsLoaded && wlStudents && wlStudents.length > 0 && (
        <React.Fragment>
          <div style={{ height: "40px" }} />
          <h3 className="section-detail-page-title">Waitlisted</h3>
          <table className="csm-table standalone">
            <thead className="csm-table-head">
              <tr className="csm-table-head-row">
                <th className="csm-table-item">Position</th>
                <th className="csm-table-item">Name</th>
                <th className="csm-table-item">Email</th>
                <th className="csm-table-item">
                  <CopyIcon id="copy-student-emails" height="1em" width="1em" onClick={wlHandleCopyEmails} />
                  {wlEmailsCopied && <CheckCircle id="copy-student-emails-success" height="1em" width="1em" />}
                </th>
              </tr>
            </thead>
            <tbody>
              {wlStudents.map(({ position, name, email, id }) => (
                <tr key={id} className="csm-table-row">
                  <td className="csm-table-item">{position}</td>
                  <td className="csm-table-item">{name}</td>
                  <td className="csm-table-item">{email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      )}{" "}
      {wlStudentsLoadError && <h3>Waitlisted students could not be loaded</h3>}
    </React.Fragment>
  );
}
