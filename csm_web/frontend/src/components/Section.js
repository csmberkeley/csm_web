import React from "react";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";

export default class Section extends React.Component {
  static propTypes = {
    match: PropTypes.shape({ params: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired }).isRequired
  };

  state = { section: null, loaded: false };

  componentDidMount() {
    fetchJSON(`/sections/${this.props.match.params.id}`).then(section => this.setState({ section, loaded: true }));
  }

  render() {
    const { section, loaded } = this.state;
    return !loaded ? null : section.isStudent ? <StudentSection {...section} /> : <MentorSection {...section} />;
  }
}

function SectionHeader({ course, courseTitle, isStudent }) {
  const relation = isStudent ? "student" : "mentor";
  return (
    <div className="section-detail-header">
      <div className="section-detail-header-title">
        <h3>{course}</h3>
        <h4>{courseTitle}</h4>
      </div>
      <div className="relation-label" style={{ backgroundColor: `var(--csm-${relation})` }}>
        {relation}
      </div>
    </div>
  );
}

SectionHeader.propTypes = {
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  isStudent: PropTypes.bool.isRequired
};

function InfoCard({ title, children }) {
  return (
    <div className="section-detail-info-card">
      <h4>{title}</h4>
      <div className={`section-detail-info-card-contents ${title.toLowerCase().replace(/ /g, "-")}`}>{children}</div>
    </div>
  );
}

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]).isRequired
};

function StudentSection({ course, courseTitle, mentor, spacetime: { location, time }, override }) {
  function StudentSectionInfo() {
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
          <InfoCard title="Time and Location">
            <h5>{location}</h5>
            <h5>{time}</h5>
            {override && (
              <React.Fragment>
                <div className="divider" />
                <div className="override-label">Adjusted for {override.date}</div>
                <h5>{override.spacetime.location}</h5>
                <h5>{override.spacetime.time}</h5>
              </React.Fragment>
            )}
          </InfoCard>
        </div>
      </React.Fragment>
    );
  }
  return (
    <section>
      <SectionHeader course={course} courseTitle={courseTitle} isStudent={true} />
      <StudentSectionInfo />
    </section>
  );
}

const SPACETIME_SHAPE = PropTypes.shape({ location: PropTypes.string.isRequired, time: PropTypes.string.isRequired });

StudentSection.propTypes = {
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  mentor: PropTypes.shape({ email: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  spacetime: SPACETIME_SHAPE.isRequired,
  override: PropTypes.shape({ spacetime: SPACETIME_SHAPE.isRequired, date: PropTypes.string.isRequired })
};

function MentorSection() {
  return <div>I am a mentor</div>;
}
