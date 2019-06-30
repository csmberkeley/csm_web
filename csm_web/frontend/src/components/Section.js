import React from "react";
import Override from "./Override";
import DropSection from "./DropSection";
import Roster from "./Roster";
import moment from "moment";
import { fetchWithMethod, HTTP_METHODS } from "../utils/api";
const DAYS_OF_WEEK = Object.freeze({
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6
});

function InfoField(props) {
  return (
    <span title={props.title} onClick={props.onClick}>
      <span className="field-icon" data-uk-icon={props.icon} />
      {props.children}
    </span>
  );
}

class SectionHeader extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isEditing: false,
      ...props.defaultSpacetime,
      originalSpacetime: { ...props.defaultSpacetime }
    };
    this._handleClickEditableField = this._handleClickEditableField.bind(this);
    this._handleChange = this._handleChange.bind(this);
		this._handleCancel = this._handleCancel.bind(this);
		this._handleSave = this._handleSave.bind(this);
  }

  _handleClickEditableField() {
    this.setState({ isEditing: true });
  }

  _handleChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

	_handleCancel() {
		this.setState(state => ({...state.originalSpacetime, isEditing: false}));
	}

	_handleSave(event) {
		//TODO: PATCH to API
		event.preventDefault();
		this.setState({isEditing: false});

	}

  render() {
    return (
      <div className="section-header">
        {!this.props.isMentor && <DropSection profileID={this.props.profile} />}

        <h3>{this.props.courseName.replace(/^(CS|EE)/, "$1 ")}</h3>
        <div className="section-information">
          <InfoField title="Mentor" icon="user">{`${
            this.props.mentor.firstName
          } ${this.props.mentor.lastName}`}</InfoField>
          <InfoField title="Mentor email" icon="mail">
            <a href={`mailto:${this.props.mentor.email}`}>
              {this.props.mentor.email}
            </a>
          </InfoField>
					{/* associate inputs with a hidden form element so that we can use the HTML5 required attribute */}
					{this.state.isEditing && <form hidden id="override-form"/>}
          <InfoField
            title="Section time"
            icon="calendar"
            onClick={this._handleClickEditableField}
          >

            {this.state.isEditing ? (
              <span>
                <select
                  onChange={this._handleChange}
                  value={this.state.dayOfWeek}
                  name="dayOfWeek"
									form="override-form"
                >
                  {Object.keys(DAYS_OF_WEEK).map(day => (
                    <option key={day} value={day}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  onChange={this._handleChange}
                  type="time"
                  value={this.state.startTime}
                  name="startTime"
									form="override-form"
									required
                />
                <input
                  onChange={this._handleChange}
                  type="time"
                  value={this.state.endTime}
                  name="endTime"
									form="override-form"
									required
                />
              </span>
            ) : (
              <span className="editable-content">
                {moment(this.state.dayOfWeek, "dddd").format("ddd")}{" "}
                {moment(this.state.startTime, "HH:mm").format("h:mm A")} -{" "}
                {moment(this.state.endTime, "HH:mm").format("h:mm A")}
              </span>
            )}
          </InfoField>
          <InfoField
            title="Section location"
            icon="location"
            onClick={this._handleClickEditableField}
          >
            {this.state.isEditing ? (
              <input
                onChange={this._handleChange}
                name="location"
                type="text"
                value={this.state.location}
								form="override-form"
								required
              />
            ) : (
              <span className="editable-field" title="Section location">
                <span className="editable-content">{this.state.location}</span>
              </span>
            )}
          </InfoField>
          {this.state.isEditing && (
							<div className="edit-buttons-container">
								<button form="override-form" type="submit" onClick={this._handleSave} value="Save">Save</button>
								<button onClick={this._handleCancel} value="Cancel">Cancel</button>
							</div>)}

        </div>

				{/* remember to remove this and actually render the roster button */}
        {this.props.isMentor && false && ( 
          <Roster
            studentIDs={this.props.studentIDs}
            sectionID={this.props.sectionID}
          />
        )}
      </div>
    );
  }
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
      return (
        <li>
          <a className="uk-accordion-title" href="#">
            {moment(this.state.weekStart, "YYYY-MM-DD")
              .add(DAYS_OF_WEEK[this.props.defaultSpacetime.dayOfWeek], "days")
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
    ).format("HH:mm");
    defaultSpacetime.endTime = moment(
      defaultSpacetime.endTime,
      "HH:mm:ss"
    ).format("HH:mm");
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
