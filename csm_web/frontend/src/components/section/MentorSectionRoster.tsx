import React, { useState } from "react";

import { useSectionStudents } from "../../utils/queries/sections";
import LoadingSpinner from "../LoadingSpinner";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import CopyIcon from "../../../static/frontend/img/copy.svg";

import MentorSectionEmailTemp from "../emailing/MentorSectionEmailTemp";
import  './section.scss';

interface MentorSectionRosterProps {
  id: number;
}

export default function MentorSectionRoster({ id }: MentorSectionRosterProps) {
  const { data: students, isSuccess: studentsLoaded, isError: studentsLoadError } = useSectionStudents(id);
  const [emailsCopied, setEmailsCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const handleCopyEmails = () => {
    if (studentsLoaded) {
      navigator.clipboard.writeText(students.map(({ email }) => email).join("\n")).then(() => {
        setEmailsCopied(true);
        setTimeout(() => setEmailsCopied(false), 1500);
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
      
      <button onClick={() => setIsOpen(true)}>Save & Preview</button>
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <button onClick={() => setIsOpen(false)}>×</button>
          <h2>Subject here</h2>
          <hr style={{ border: '1px solid black' }} />
          <p>Email content here</p>
          <hr style={{ border: '1px solid black' }} />
          <button>Send</button>
        </div>
      </div>
      )}

      <MentorSectionEmailTemp></MentorSectionEmailTemp>
  

      

    </React.Fragment>
  );
}
