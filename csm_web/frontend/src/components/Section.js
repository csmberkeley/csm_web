import React from "react";
import * as Cookies from "js-cookie";
import Override from "./Override";

function SectionSummary(props) {
  return (
    <div className="uk-section uk-section-primary section-summary">
      <div className="uk-container">
        <div>
          <h2>{props.courseName}</h2>
          {props.isMentor && <Override sectionID={props.sectionID} />}
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
    this.state = Object.assign({}, props.attendance);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    this.setState({
      [event.target.id]: [event.target.name, event.target.value]
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    for (let pk of Object.keys(this.state)) {
      const [studentName, presence] = this.state[pk];
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
    const studentAttendances = Object.entries(this.state);
    const studentAttendanceListEntries = studentAttendances.map(
      (attendance, index) => {
        const [pk, details] = attendance;
        const [studentName, presence] = details;
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
              <option value="EX">Excused Absence</option>
              <option value="UN">Unexcused Absence</option>
              <option value="PR">Present</option>
            </select>
          </div>
        );
      }
    );
    return (
      <div>
        <h4>Week {this.props.weekNum}</h4>
        <form className="uk-form-horizontal" onSubmit={this.handleSubmit}>
          {studentAttendanceListEntries}
          <button className="uk-button uk-button-default uk-button-small">
            Save changes
          </button>
        </form>
      </div>
    );
  }
}

class Attendances extends React.Component {
  render() {
    const attendances = this.props.attendances;
    const weekAttendances = attendances.map((attendance, index) => (
      <WeekAttendance attendance={attendance} weekNum={index} key={index} />
    ));
    return <div className="uk-container">{weekAttendances}</div>;
  }
}

function Section(props) {
  return (
    <div>
      <SectionSummary
        defaultSpacetime={props.defaultSpacetime}
        mentor={props.mentor}
        courseName={props.courseName}
        isMentor={props.isMentor}
        sectionID={props.id}
      />
      <Attendances attendances={props.attendances} />
    </div>
  );
}

export default Section;
export { SectionSummary };
