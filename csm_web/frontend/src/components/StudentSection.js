import React, { useEffect, useState } from "react";
import { Switch, Route, Redirect } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import Modal from "./Modal";
import { InfoCard, SectionHeader, SectionSidebar, ATTENDANCE_LABELS, SectionSpacetime } from "./Section";

export default function StudentSection({ course, courseTitle, mentor, spacetime, override, associatedProfileId, url }) {
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
          <SectionSpacetime spacetime={spacetime} override={override} />
          <DropSection profileId={associatedProfileId} />
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

StudentSection.propTypes = {
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  mentor: PropTypes.shape({ email: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object.isRequired,
  associatedProfileId: PropTypes.number.isRequired,
  url: PropTypes.string.isRequired
};

class DropSection extends React.Component {
  static STAGES = Object.freeze({ INITIAL: "INITIAL", CONFIRM: "CONFIRM", DROPPED: "DROPPED" });
  static propTypes = { profileId: PropTypes.number.isRequired };

  constructor(props) {
    super(props);
    this.state = { stage: DropSection.STAGES.INITIAL };
    this.performDrop = this.performDrop.bind(this);
  }

  performDrop() {
    //TODO: Handle API failure
    fetchWithMethod(`students/${this.props.profileId}/drop`, HTTP_METHODS.PATCH);
    this.setState({ stage: DropSection.STAGES.DROPPED });
  }

  render() {
    switch (this.state.stage) {
      case DropSection.STAGES.INITIAL:
        return (
          <InfoCard title="Drop Section" showTitle={false}>
            <h5>Drop Section</h5>
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
            <button className="danger-btn" onClick={this.performDrop}>
              Confirm
            </button>
          </Modal>
        );
      case DropSection.STAGES.DROPPED:
        return <Redirect to="/" />;
    }
  }
}
