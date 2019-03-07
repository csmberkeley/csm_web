import React from "react";
import Override from "./Override";
import DropSection from "./DropSection";
import Roster from "./Roster";
import moment from "moment";
import { fetchWithMethod, HTTP_METHODS } from "../utils/api";

function SectionSummary(props) {
  return (
    <div className="uk-section uk-section-primary section-summary">
      <div className="uk-container">
        <div>
          {!props.isMentor && <DropSection profileID={props.profile} />}

          <h2 style={{ clear: "both" }}>{props.courseName}</h2>
          {props.isMentor && <Override sectionID={props.sectionID} />}
          {props.isMentor && (
            <Roster studentIDs={props.studentIDs} sectionID={props.sectionID} />
          )}
        </div>
        <p>
          {props.defaultSpacetime.dayOfWeek} {props.defaultSpacetime.startTime}{" "}
          - {props.defaultSpacetime.endTime}
        </p>
        <p>{props.defaultSpacetime.location}</p>
        <p>{`${props.mentor.firstName} ${props.mentor.lastName}`} </p>
        <a href={`mailto:${props.mentor.email}`}>{props.mentor.email}</a>
      </div>
    </div>
  );
}

class WeekAttendance extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      attendance: Object.assign({}, props.attendance),
      changed: new Set(),
      status: "unchanged"
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    const { id, name, value } = event.target;
    this.setState(state => ({
      attendance: (() => {
        state.attendance[id] = [name, value];
        return state.attendance;
      })(),
      changed: state.changed.add(id)
    }));
  }

  async handleSubmit(event) {
    event.preventDefault();
    //var ok = true;
    this.setState({ status: "loading" });
    let requests = Array.from(this.state.changed).map(pk => {
      const [studentName, presence] = this.state.attendance[pk];
      return fetchWithMethod(`attendances/${pk}/`, HTTP_METHODS.PATCH, {
        presence: presence
      }).then(response => response.ok);
    });
    await Promise.all(requests)
      .then(() =>
        this.setState(
          {
            status: requests.every(request => request) ? "successful" : "failed"
          },
          () => setTimeout(() => this.setState({ status: "unchanged" }), 3000)
        )
      )
      .catch(() =>
        this.setState({ status: "failed" }, () =>
          setTimeout(() => this.setState({ status: "unchanged" }), 3000)
        )
      );
  }

  render() {
    const presenceDisplayMap = {
      EX: "Excused Absence",
      UN: "Unexcused Absence",
      PR: "Present",
      "": "Your mentor has not yet recorded attendance for this week"
    };
    const studentAttendances = Object.entries(this.state.attendance);
    const studentAttendanceListEntries = studentAttendances.map(attendance => {
      const [pk, details] = attendance;
      const [studentName, presence] = details;
      if (this.props.isMentor) {
        return (
          <div key={pk} className="uk-margin">
            <label className="uk-form-label" htmlFor={pk}>
              {" "}
              {studentName}
            </label>
            <select
              id={pk}
              className="uk-select uk-form-width-medium"
              value={presence}
              name={studentName}
              onChange={this.handleInputChange}
            >
              <option value="">---</option>
              <option value="EX">{presenceDisplayMap["EX"]}</option>
              <option value="UN">{presenceDisplayMap["UN"]}</option>
              <option value="PR">{presenceDisplayMap["PR"]}</option>
            </select>
          </div>
        );
      } else {
        return (
          <div key={pk} className="uk-margin">
            <p>{presenceDisplayMap[presence]}</p>
          </div>
        );
      }
    });
    if (this.props.isMentor) {
      return (
        <li>
          <a className="uk-accordion-title" href="#">
            Week {this.props.weekNum}
          </a>
          <div className="uk-accordion-content">
            <form className="uk-form-horizontal" onSubmit={this.handleSubmit}>
              {studentAttendanceListEntries}
              <button className="uk-button uk-button-default uk-button-small">
                Save changes
              </button>
              {this.state.status == "loading" && (
                <span
                  data-uk-spinner="ratio: 1"
                  style={{ marginLeft: "5px" }}
                />
              )}
              {this.state.status == "successful" && (
                <span
                  data-uk-icon="icon: check; ratio: 1.5"
                  style={{ color: "green" }}
                />
              )}
              {this.state.status == "failed" && (
                <span style={{ fontWeight: "bold" }}>
                  <span
                    data-uk-icon="icon: close; ratio: 1.5"
                    style={{ color: "red" }}
                  />
                  Unable to save attendance
                </span>
              )}
            </form>
          </div>
        </li>
      );
    } else {
      return (
        <li>
          <a className="uk-accordion-title" href="#">
            Week {this.props.weekNum}
          </a>
          <div className="uk-accordion-content">
            {studentAttendanceListEntries}
          </div>
        </li>
      );
    }
  }
}

class Attendances extends React.Component {
  render() {
    const attendances = this.props.attendances;
    if (attendances) {
      const weekAttendances = attendances.map((attendance, index) => (
        <WeekAttendance
          attendance={attendance}
          weekNum={index}
          key={index}
          isMentor={this.props.isMentor}
        />
      ));
      weekAttendances.reverse();
      return (
        <div className="uk-container">
          <ul data-uk-accordion="active: 0">{weekAttendances}</ul>
        </div>
      );
    }
  }
}

class Section extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    const defaultSpacetime = Object.assign(
      {},
      this.props.activeOverride
        ? this.props.activeOverride.spacetime
        : this.props.defaultSpacetime
    ); // this.props are supposed to be immutable
    defaultSpacetime.startTime = moment(
      defaultSpacetime.startTime,
      "HH:mm:ss"
    ).format("hh:mm A");
    defaultSpacetime.endTime = moment(
      defaultSpacetime.endTime,
      "HH:mm:ss"
    ).format("hh:mm A");
    return (
      <div>
        <SectionSummary
          defaultSpacetime={defaultSpacetime}
          mentor={this.props.mentor.user}
          courseName={this.props.courseName}
          isMentor={this.props.isMentor}
          sectionID={this.props.id}
          profile={this.props.profile}
          studentIDs={this.props.students}
        />
        <Attendances
          attendances={this.props.attendances}
          isMentor={this.props.isMentor}
        />
      </div>
    );
  }

  componentWillUnmount() {
    const modals = document.querySelectorAll('[data-uk-modal="true"]');
    modals.forEach(modal => modal.remove());
  }
}
export default Section;
export { SectionSummary };
