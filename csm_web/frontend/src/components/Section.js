import React from "react";
import Override from "./Override";
import DropSection from "./DropSection";
import Roster from "./Roster";
import moment from "moment";
import { fetchWithMethod, HTTP_METHODS } from "../utils/api";

function SectionHeader(props) {
  let overrideStyle = props.activeOverride
    ? "section-summary-override-flex-item"
    : "section-summary-default-flex-item";
  return (
    <div className="section-header">
      {!props.isMentor && <DropSection profileID={props.profile} />}

      <h3>{props.courseName.replace(/^(CS|EE)/, "$1 ")}</h3>
      <div className="section-information">
        <span title="Mentor">
          <span className="field-icon" data-uk-icon="user" />
          {`${props.mentor.firstName} ${props.mentor.lastName}`}
        </span>
        <span title="Mentor email">
          <span className="field-icon" data-uk-icon="mail" />

          <a
            href={`mailto:${props.mentor.email}`}
            title="Send an email to your mentor"
          >
            {props.mentor.email}
          </a>
        </span>

        <span className="editable-field" title="Section time">
          <span className="field-icon" data-uk-icon="calendar" />
          <span className="editable-content">
            {moment(props.defaultSpacetime.dayOfWeek, "dddd").format("ddd")}{" "}
            {props.defaultSpacetime.startTime} -{" "}
            {props.defaultSpacetime.endTime}
          </span>
        </span>
        <span className="editable-field" title="Section location">
          <span className="field-icon" data-uk-icon="location" />
          <span className="editable-content">
            {props.defaultSpacetime.location}
          </span>
        </span>
      </div>

      {props.isMentor && <Override sectionID={props.sectionID} />}
      {props.isMentor && (
        <Roster studentIDs={props.studentIDs} sectionID={props.sectionID} />
      )}
    </div>
  );
}

class WeekAttendance extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      attendance: props.attendance[1],
      weekStart: props.attendance[0],
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
    this.setState({
      status: "loading"
    });
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
          () =>
            setTimeout(
              () =>
                this.setState({
                  status: "unchanged"
                }),
              3000
            )
        )
      )
      .catch(() =>
        this.setState(
          {
            status: "failed"
          },
          () =>
            setTimeout(
              () =>
                this.setState({
                  status: "unchanged"
                }),
              3000
            )
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
      const dayOfWeek = {
        Sunday: 0,
        Monday: 1,
        Tuesday: 2,
        Wednesday: 3,
        Thursday: 4,
        Friday: 5,
        Saturday: 6
      };
      return (
        <li>
          <a className="uk-accordion-title" href="#">
            {moment(this.state.weekStart, "YYYY-MM-DD")
              .add(dayOfWeek[this.props.defaultSpacetime.dayOfWeek], "days")
              .format("MMMM Do")}
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
            Week
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
  constructor(props) {
    super(props);
    this.state = {
      expanded: false
    };
    this.toggleWeeks = this.toggleWeeks.bind(this);
  }

  toggleWeeks() {
    this.setState(state => {
      return { expanded: !state.expanded };
    });
  }

  render() {
    const attendances = this.props.attendances;
    if (attendances) {
      const weekAttendances = Object.entries(attendances).map(
        (attendance, index) => (
          <WeekAttendance
            attendance={attendance}
            defaultSpacetime={this.props.defaultSpacetime}
            key={index}
            isMentor={this.props.isMentor}
          />
        )
      );
      weekAttendances.reverse();
      const shownAttendances = weekAttendances.slice(
        0,
        this.state.expanded ? this.props.attendances.length : 2
      );
      return (
        <div className="uk-container">
          <ul data-uk-accordion="active: 0">{shownAttendances}</ul>
          <button
            id="show-more-btn"
            type="button"
            className="uk-button uk-button-default uk-button-small"
            onClick={this.toggleWeeks}
          >
            {this.state.expanded ? "Show Less" : "Show More"}
          </button>
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
    ).format("h:mm A");
    defaultSpacetime.endTime = moment(
      defaultSpacetime.endTime,
      "HH:mm:ss"
    ).format("h:mm A");
    return (
      <div>
        <SectionHeader
          defaultSpacetime={defaultSpacetime}
          mentor={this.props.mentor.user}
          courseName={this.props.courseName}
          isMentor={this.props.isMentor}
          sectionID={this.props.id}
          profile={this.props.profile}
          studentIDs={this.props.students}
          activeOverride={this.props.activeOverride}
        />
        <Attendances
          attendances={this.props.attendances}
          isMentor={this.props.isMentor}
          defaultSpacetime={defaultSpacetime}
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
export { SectionHeader };
