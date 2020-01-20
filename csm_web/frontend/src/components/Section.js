import React, { useEffect, useState } from "react";
import { Switch, Route, NavLink, Redirect } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";
import Modal from "./Modal";

export default class Section extends React.Component {
  static propTypes = {
    match: PropTypes.shape({
      params: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
      url: PropTypes.string.isRequired
    }).isRequired
  };

  state = { section: null, loaded: false };

  componentDidMount() {
    fetchJSON(`/sections/${this.props.match.params.id}`).then(section => this.setState({ section, loaded: true }));
  }

  render() {
    const { section, loaded } = this.state;
    const { url } = this.props.match;
    return !loaded ? null : section.isStudent ? (
      <StudentSection url={url} {...section} />
    ) : (
      <MentorSection {...section} />
    );
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

function SectionSidebar({ links }) {
  return (
    <nav id="section-detail-sidebar">
      {links.map(([label, href]) => (
        <NavLink exact to={href} key={href}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

SectionSidebar.propTypes = { links: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired };

function InfoCard({ title, children, showTitle = true }) {
  const cssClass = title.toLowerCase().replace(/ /g, "-");
  return (
    <div className={`section-detail-info-card ${cssClass}`}>
      {showTitle && <h4>{title}</h4>}
      <div className={`section-detail-info-card-contents ${cssClass}`}>{children}</div>
    </div>
  );
}

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]).isRequired,
  showTitle: PropTypes.bool
};

// Values are [label, css class suffix]
const ATTENDANCE_LABELS = Object.freeze({
  UN: ["Unexcused Absence", "unexcused"],
  EX: ["Excused Absence", "excused"],
  PR: ["Present", "present"],
  "": ["", ""]
});

class DropSection extends React.Component {
  static STAGES = Object.freeze({ INITIAL: "INITIAL", CONFIRM: "CONFIRM", DROPPED: "DROPPED" });
  state = { stage: DropSection.STAGES.INITIAL };
  render() {
    switch (this.state.stage) {
      case DropSection.STAGES.INITIAL:
        return (
          <InfoCard title="Drop Section" showTitle={false}>
            <h4>Drop Section</h4>
            <button className="danger-btn" onClick={() => this.setState({ stage: DropSection.STAGES.CONFIRM })}>
              <span className="inline-plus-sign">+</span>Drop
            </button>
          </InfoCard>
        );
      case DropSection.STAGES.CONFIRM:
        return (
          <Modal className="drop-confirmation" closeModal={() => this.setState({ stage: DropSection.STAGES.INITIAL })}>
            <h5>Are you sure you want to drop?</h5>
            <p>You are not guaranteed an available spot in another section!</p>
            <button className="danger-btn" onClick={() => this.setState({ stage: DropSection.STAGES.DROPPED })}>
              Confirm
            </button>
          </Modal>
        );
      case DropSection.STAGES.DROPPED:
        return <Redirect to="/" />;
    }
  }
}

function StudentSection({
  course,
  courseTitle,
  mentor,
  spacetime: { location, time },
  override,
  associatedProfileId,
  url
}) {
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
          <DropSection />
        </div>
      </React.Fragment>
    );
  }

  function StudentSectionAttendance() {
    const [state, setState] = useState({ attendances: null, loaded: false });
    useEffect(() => {
      fetchJSON(`/students/${associatedProfileId}/attendances`).then(attendances =>
        setState({ attendances, loaded: true })
      );
    }, [associatedProfileId]);
    const { attendances, loaded } = state;
    return !loaded ? null : (
      <table id="attendance-table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {attendances.map(({ presence, weekStart }) => {
            const [label, cssSuffix] = ATTENDANCE_LABELS[presence];
            return (
              <tr key={weekStart}>
                <td>{weekStart}</td>
                <td className="status">
                  <div style={{ backgroundColor: `var(--csm-attendance-${cssSuffix})` }}>{label}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  return (
    <section>
      <SectionHeader course={course} courseTitle={courseTitle} isStudent={true} />
      <div id="section-detail-body">
        <SectionSidebar
          links={[
            ["Section", url],
            ["Attendance", `${url}/attendance`]
          ]}
        />
        <div id="section-detail-main">
          <Switch>
            <Route path={`${url}/attendance`} component={StudentSectionAttendance} />
            <Route path={url} component={StudentSectionInfo} />
          </Switch>
        </div>
      </div>
    </section>
  );
}

const SPACETIME_SHAPE = PropTypes.shape({ location: PropTypes.string.isRequired, time: PropTypes.string.isRequired });

StudentSection.propTypes = {
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  mentor: PropTypes.shape({ email: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  spacetime: SPACETIME_SHAPE.isRequired,
  override: PropTypes.shape({ spacetime: SPACETIME_SHAPE.isRequired, date: PropTypes.string.isRequired }),
  associatedProfileId: PropTypes.number.isRequired,
  url: PropTypes.string.isRequired
};

function MentorSection() {
  return <div>I am a mentor</div>;
}
