import React from "react";
import * as Cookies from "js-cookie";

class Override extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: null,
      startTime: null,
      duration: null,
      dayOfWeek: null,
      date: null
    };
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  handleInputChange(event) {
    const [name, value] = [event.target.name, event.target.value];
    this.setState({ [name]: value });
  }

  render() {
    const inputParameters = [
      ["Location", "location", "text"],
      ["Start time", "startTime", "time"],
      ["Duration", "duration", "number"],
      ["Date", "date", "date"]
    ];
    const inputs = inputParameters.map(parameters => {
      const [label, name, type] = parameters;
      return (
        <label>
          {label}
          <input
            name={name}
            type={type}
            onChange={this.handleInputChange}
            className="uk-input"
          />
        </label>
      );
    });

    return (
      <div>
        <button
          className="uk-button uk-button-default"
          type="button"
          style={{ float: "right" }}
          data-uk-toggle="target: #override-modal"
        >
          Override
        </button>
        <div id="override-modal" data-uk-modal>
          <div className="uk-modal-dialog uk-modal-body">
            <button
              className="uk-modal-close"
              type="button"
              style={{ float: "right" }}
              data-uk-icon="icon: close"
            >
              {" "}
            </button>
            <h2 className="uk-modal-title" style={{ marginTop: "0px" }}>
              Override
            </h2>
            <form>{inputs}</form>
          </div>
        </div>
      </div>
    );
  }
}

function SectionSummary(props) {
  return (
    <div className="uk-section uk-section-primary section-summary">
      <div className="uk-container">
        <div>
          <h2>{props.courseName}</h2>
          {props.isMentor && <Override />}
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
  /*
  constructor(props) {
    super(props);
    this.state = {
      profile: props.profile,
      attendances: []
    };
  }
  componentDidMount() {
    fetch(`/scheduler/profiles/${this.state.profile}/attendance`)
      .then(response => response.json())
      .then(attendances =>
        this.setState((state, props) => {
          return {
            attendances: [...attendances, ...state.attendances]
          };
        })
      );
  }
	*/
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
      />
      <Attendances attendances={props.attendances} />
    </div>
  );
}

export default Section;
export { SectionSummary };
