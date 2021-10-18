import React, { useState } from "react";
import LoadingSpinner from "../LoadingSpinner";
import { Student } from "../../utils/types";

import CopyIcon from "../../../static/frontend/img/copy.svg";
import CheckCircle from "../../../static/frontend/img/check_circle.svg";

interface MentorSectionRosterProps {
  students: Student[];
  loaded: boolean;
}

export default function MentorSectionRoster({ students, loaded }: MentorSectionRosterProps) {
  const [emailsCopied, setEmailsCopied] = useState(false);
  const handleCopyEmails = () => {
    navigator.clipboard.writeText(students.map(({ email }) => email).join("\n")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 1500);
    });
  };
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">Roster</h3>
      {loaded && (
        <table className="standalone-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>
                <CopyIcon id="copy-student-emails" height="1em" width="1em" onClick={handleCopyEmails} />
                {emailsCopied && <CheckCircle id="copy-student-emails-success" height="1em" width="1em" />}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map(({ name, email, id }) => (
              <tr key={id}>
                <td>{name}</td>
                <td>{email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loaded && <LoadingSpinner />}
    </React.Fragment>
  );
}
