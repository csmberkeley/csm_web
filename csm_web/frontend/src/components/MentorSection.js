import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";
import { SectionDetail, InfoCard, SectionSpacetime } from "./Section";
import { Switch, Route } from "react-router-dom";
import { groupBy } from "lodash";
import CopyIcon from "../../static/frontend/img/copy.svg";
import CheckCircle from "../../static/frontend/img/check_circle.svg";
export default function MentorSection({ id, url, course, courseTitle, spacetime, override }) {
  const [{ students, studentsLoaded }, setState] = useState({ students: [], studentsLoaded: false });
  useEffect(() => {
    setState({ students: [], studentsLoaded: false });
    fetchJSON(`/sections/${id}/students/`).then(students => setState({ students, studentsLoaded: true }));
  }, [id]);

  return (
    <SectionDetail
      course={course}
      courseTitle={courseTitle}
      isStudent={false}
      links={[
        ["Section", url],
        ["Attendance", `${url}/attendance`],
        ["Roster", `${url}/roster`]
      ]}
    >
      <Switch>
        <Route
          path={`${url}/attendance`}
          render={() => <MentorSectionAttendance students={students} studentsLoaded={studentsLoaded} />}
        />
        <Route
          path={`${url}/roster`}
          render={() => <MentorSectionRoster students={students} studentsLoaded={studentsLoaded} />}
        />
        <Route
          path={url}
          render={() => (
            <MentorSectionInfo
              students={students}
              studentsLoaded={studentsLoaded}
              spacetime={spacetime}
              override={override}
            />
          )}
        />
      </Switch>
    </SectionDetail>
  );
}

MentorSection.propTypes = {
  id: PropTypes.number.isRequired,
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object,
  url: PropTypes.string.isRequired
};

function MentorSectionAttendance({ studentsLoaded, students }) {
  /*
  const attendances = groupBy(
    students.flatMap(({ name, id, attendances }) =>
      attendances.map(attendance => ({ ...attendance, student: { name, id } }))
    ),
    attendance => attendance.weekStart
  );
	*/
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">Attendance</h3>
    </React.Fragment>
  );
}

MentorSectionAttendance.propTypes = {
  studentsLoaded: PropTypes.bool.isRequired,
  students: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      id: PropTypes.number.isRequired,
      attendances: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.number.isRequired,
          presence: PropTypes.string.isRequired,
          weekStart: PropTypes.string.isRequired
        })
      ).isRequired
    })
  )
};

function MentorSectionInfo({ students, studentsLoaded, spacetime, override }) {
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">My Section</h3>
      <div className="section-info-cards-container">
        <InfoCard title="Students">
          {studentsLoaded && (
            <table id="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {students.map(({ name, id }) => (
                  <tr key={id}>
                    <td>{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!studentsLoaded && <h5>Loading students...</h5>}
        </InfoCard>
        <SectionSpacetime spacetime={spacetime} override={override} />
      </div>
    </React.Fragment>
  );
}

MentorSectionInfo.propTypes = {
  students: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string.isRequired, id: PropTypes.number.isRequired }))
    .isRequired,
  studentsLoaded: PropTypes.bool.isRequired,
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object
};

function MentorSectionRoster({ students, studentsLoaded }) {
  const [emailsCopied, setEmailsCopied] = useState(false);
  const handleCopyEmails = () => {
    navigator.clipboard.writeText(students.map(({ email }) => email).join(" ")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 1500);
    });
  };
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">Roster</h3>
      {studentsLoaded && (
        <table className="standalone-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>
                <CopyIcon id="copy-student-emails" height="1em" width="1em" onClick={handleCopyEmails} />
                {emailsCopied && (
                  <CheckCircle id="copy-student-emails-success" color="green" height="1em" width="1em" />
                )}
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
      {!studentsLoaded && <h5>Loading roster...</h5>}
    </React.Fragment>
  );
}

MentorSectionRoster.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired
    })
  ).isRequired,
  studentsLoaded: PropTypes.bool.isRequired
};
