import React from "react";
import PropTypes from "prop-types";
import { InfoCard, SectionHeader, SectionSpacetime } from "./Section";
export default function MentorSection({ course, courseTitle, spacetime, override, studentNames }) {
  function MentorSectionInfo() {
    return (
      <React.Fragment>
        <SectionHeader course={course} courseTitle={courseTitle} isStudent={false} />
        <h3 className="section-detail-page-title">My Section</h3>
        <div className="section-info-cards-container">
          <InfoCard title="Students">
            <table id="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {studentNames.map(name => (
                  <tr key={name}>
                    <td>{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </InfoCard>
          <SectionSpacetime spacetime={spacetime} override={override} />
        </div>
      </React.Fragment>
    );
  }
  return <MentorSectionInfo />;
}

MentorSection.propTypes = {
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  mentor: PropTypes.shape({ email: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object.isRequired,
  associatedProfileId: PropTypes.number.isRequired,
  url: PropTypes.string.isRequired,
  studentNames: PropTypes.arrayOf(PropTypes.string).isRequired
};
