import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";
import { SectionDetail, InfoCard, SectionSpacetime } from "./Section";
import { Switch, Route } from "react-router-dom";
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
        ["Attendance", `${url}/attendance`]
      ]}
    >
      <Switch>
        <Route path={`${url}/attendance`} component={MentorSectionAttendance} />
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

function MentorSectionAttendance() {
  return <div>TODO</div>;
}

function MentorSectionInfo({ students, studentsLoaded, spacetime, override }) {
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">My Section</h3>
      <div className="section-info-cards-container">
        <InfoCard title="Students">
          {studentsLoaded && (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {students.map(({ name, email }) => (
                  <tr key={email}>
                    <td>{name}</td>
                    <td>{email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!studentsLoaded && <h5>Loading student information...</h5>}
        </InfoCard>
        <SectionSpacetime spacetime={spacetime} override={override} />
      </div>
    </React.Fragment>
  );
}
MentorSectionInfo.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({ name: PropTypes.string.isRequired, email: PropTypes.string.isRequired })
  ).isRequired,
  studentsLoaded: PropTypes.bool.isRequired,
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object
};
