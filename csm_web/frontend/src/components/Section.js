import React from "react";
import Cookies from "js-cookie";
import Override from "./Override";
import DropSection from "./DropSection";
import Roster from "./Roster";
import moment from "moment";

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
        <p>
          {props.mentor.mentorName}{" "}
          <a href={`mailto:${props.mentor.mentorEmail}`}>
            {props.mentor.mentorEmail}
          </a>
        </p>
      </div>
    </div>
  );
}

class WeekAttendance extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      attendance: Object.assign({}, props.attendance),
      changed: new Set()
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    const { id, name, value } = event.target;
    this.setState((state, props) => ({
      attendance: (() => {
        state.attendance[id] = [name, value];
        return state.attendance;
      })(),
      changed: state.changed.add(id)
    }));
  }

  handleSubmit(event) {
    event.preventDefault();
    for (let pk of this.state.changed) {
      const [studentName, presence] = this.state.attendance[pk];
      fetch(`/scheduler/attendances/${pk}/`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "X-CSRFToken": Cookies.get("csrftoken"),
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ presence: presence })
      });
    }
  }

  render() {
    const presenceDisplayMap = {
      EX: "Excused Absence",
      UN: "Unexcused Absence",
      PR: "Present",
      "": "Your mentor has not yet recorded attendance for this week"
    };
    const studentAttendances = Object.entries(this.state.attendance);
    const studentAttendanceListEntries = studentAttendances.map(
      (attendance, index) => {
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
      }
    );
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
    const defaultSpacetime = Object.assign({}, this.props.defaultSpacetime); // this.props are supposed to be immutable
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
          mentor={this.props.mentor}
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
    let rosterModal = document.getElementById("roster-modal");
    if (rosterModal) {
      rosterModal.remove();
    }
  }
}
export default Section;
export { SectionSummary };
