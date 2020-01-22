import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";
import { InfoCard, SectionHeader, SectionSpacetime, SectionSidebar } from "./Section";
import { Switch, Route } from "react-router-dom";
export default function MentorSection(props) {
  const { id, url, course, courseTitle } = props;
  const [{ students, studentsLoaded }, setState] = useState({ students: null, studentsLoaded: false });
  useEffect(() => {
    fetchJSON(`/sections/${id}/students/`).then(students => setState({ students, studentsLoaded: true }));
  }, [id]);

  const mentorSectionInfoProps = { ...props, students, studentsLoaded };
  return (
    <section>
      <SectionHeader course={course} courseTitle={courseTitle} isStudent={false} />
      <div id="section-detail-body">
        <SectionSidebar
          links={[
            ["Section", url],
            ["Attendance", `${url}/attendance`]
          ]}
        />
        <div id="section-detail-main">
          <Switch>
            <Route path={`${url}/attendance`} component={MentorSectionAttendance} />
            <Route path={url} render={() => <MentorSectionInfo {...mentorSectionInfoProps} />} />
          </Switch>
        </div>
      </div>
    </section>
  );
}

function MentorSectionAttendance() {
  return <div>TODO</div>;
}

function MentorSectionInfo({ course, courseTitle, students, studentsLoaded, spacetime, override }) {
  return (
    <React.Fragment>
      <SectionHeader course={course} courseTitle={courseTitle} isStudent={false} />
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

MentorSection.propTypes = {
  id: PropTypes.number.isRequired,
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  mentor: PropTypes.shape({ email: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object,
  associatedProfileId: PropTypes.number.isRequired,
  url: PropTypes.string.isRequired
};
