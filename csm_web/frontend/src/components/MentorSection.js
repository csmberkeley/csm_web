import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import { SPACETIME_SHAPE } from "../utils/types";
import { SectionDetail, InfoCard, SectionSpacetime, ROLES } from "./Section";
import { Switch, Route, NavLink } from "react-router-dom";
import { groupBy } from "lodash";
import CopyIcon from "../../static/frontend/img/copy.svg";
import CheckCircle from "../../static/frontend/img/check_circle.svg";
import PencilIcon from "../../static/frontend/img/pencil.svg";
import ErrorCircle from "../../static/frontend/img/error_outline.svg";
import { ATTENDANCE_LABELS } from "./Section";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";
import TimeInput from "./TimeInput";

export default function MentorSection({
  id,
  url,
  course,
  courseTitle,
  spacetimes,
  capacity,
  description,
  reloadSection,
  userRole,
  mentor
}) {
  const [{ students, attendances, loaded_progress, loaded }, setState] = useState({
    students: [],
    attendances: {},
    loaded: false,
    loaded_progress: 0
  });
  useEffect(() => {
    setState({ students: [], attendances: {}, loaded: false, loaded_progress: 0 });
    fetchJSON(`/sections/${id}/students/`).then(data => {
      const students = data
        .map(({ name, email, id }) => ({ name, email, id }))
        .sort((stu1, stu2) => stu1.name >= stu2.name);
      setState(state => {
        return {
          students,
          attendances: state.attendances,
          loaded: state.loaded_progress == 1,
          loaded_progress: state.loaded_progress + 1
        };
      });
    });
    fetchJSON(`/sections/${id}/attendance`).then(data => {
      const attendances = groupBy(
        data.flatMap(({ attendances }) =>
          attendances
            .map(({ id, presence, date, studentName, studentId }) => ({
              id,
              presence,
              date,
              student: { name: studentName, id: studentId }
            }))
            .sort((att1, att2) => att1.student.name >= att2.student.name)
        ),
        attendance => attendance.date
      );
      setState(state => {
        return {
          students: state.students,
          attendances,
          loaded: state.loaded_progress == 1,
          loaded_progress: state.loaded_progress + 1
        };
      });
    });
  }, [id]);

  const updateAttendance = (updatedDate, updatedDateAttendances) => {
    const updatedAttendances = Object.fromEntries(
      Object.entries(attendances).map(([date, dateAttendances]) => [
        date,
        date == updatedDate ? [...updatedDateAttendances] : dateAttendances
      ])
    );
    setState({ students, loaded, attendances: updatedAttendances });
  };

  return (
    <SectionDetail
      course={course}
      courseTitle={courseTitle}
      userRole={userRole}
      links={[
        ["Section", url],
        ["Attendance", `${url}/attendance`],
        ["Roster", `${url}/roster`]
      ]}
    >
      <Switch>
        <Route
          path={`${url}/attendance`}
          render={() => (
            <MentorSectionAttendance attendances={attendances} loaded={loaded} updateAttendance={updateAttendance} />
          )}
        />
        <Route path={`${url}/roster`} render={() => <MentorSectionRoster students={students} loaded={loaded} />} />
        <Route
          path={url}
          render={() => (
            <MentorSectionInfo
              isCoordinator={userRole === ROLES.COORDINATOR}
              mentor={mentor}
              reloadSection={reloadSection}
              students={students}
              loaded={loaded}
              spacetimes={spacetimes}
              capacity={capacity}
              description={description}
              id={id}
            />
          )}
        />
      </Switch>
    </SectionDetail>
  );
}

MentorSection.propTypes = {
  id: PropTypes.number.isRequired,
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  spacetimes: PropTypes.arrayOf(SPACETIME_SHAPE).isRequired,
  url: PropTypes.string.isRequired,
  reloadSection: PropTypes.func.isRequired,
  userRole: PropTypes.string.isRequired,
  mentor: PropTypes.object.isRequired,
  capacity: PropTypes.number,
  description: PropTypes.string
};

const MONTH_NUMBERS = Object.freeze({
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12
});

export const DAYS_OF_WEEK = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]);

function formatDate(dateString) {
  /*
   * Example:
   * formatDate("Jan. 6, 2020") --> "1/6"
   */
  const [month, dayAndYear] = dateString.split(".");
  const day = dayAndYear.split(",")[0].trim();
  return `${MONTH_NUMBERS[month]}/${day}`;
}

function dateSort(date1, date2) {
  const [month1, day1] = formatDate(date1)
    .split("/")
    .map(part => Number(part));
  const [month2, day2] = formatDate(date2)
    .split("/")
    .map(part => Number(part));
  return month2 - month1 || day2 - day1;
}

class MentorSectionAttendance extends React.Component {
  static propTypes = {
    loaded: PropTypes.bool.isRequired,
    attendances: PropTypes.object.isRequired,
    updateAttendance: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      selectedDate: null,
      stagedAttendances: null,
      showAttendanceSaveSuccess: false,
      showSaveSpinner: false
    };
    this.handleAttendanceChange = this.handleAttendanceChange.bind(this);
    this.handleSaveAttendance = this.handleSaveAttendance.bind(this);
    this.handleMarkAllPresent = this.handleMarkAllPresent.bind(this);
    this.attendanceTitle = React.createRef();
  }

  componentDidMount() {
    if (this.attendanceTitle.current) {
      this.attendanceTitle.current.scrollIntoView();
    }
  }

  handleAttendanceChange({ target: { name: id, value } }) {
    this.setState((prevState, props) => {
      const prevStagedAttendances = prevState.stagedAttendances || Object.values(props.attendances)[0];
      return {
        stagedAttendances: prevStagedAttendances.map(attendance =>
          attendance.id == id ? { ...attendance, presence: value } : attendance
        )
      };
    });
  }

  handleSaveAttendance() {
    const { stagedAttendances, selectedDate } = this.state;
    if (!stagedAttendances) {
      return;
    }
    //TODO: Handle API Failure
    this.setState({ showSaveSpinner: true });
    Promise.all(
      stagedAttendances.map(({ id, presence, student: { id: studentId } }) =>
        fetchWithMethod(`students/${studentId}/attendances/`, HTTP_METHODS.PUT, { id, presence })
      )
    ).then(() => {
      this.props.updateAttendance(selectedDate, stagedAttendances);
      this.setState({ showAttendanceSaveSuccess: true, showSaveSpinner: false });
      setTimeout(() => this.setState({ showAttendanceSaveSuccess: false }), 1500);
    });
  }

  handleMarkAllPresent() {
    if (!this.state.stagedAttendances) {
      const [selectedDate, stagedAttendances] = Object.entries(this.props.attendances)[0];
      this.setState({ selectedDate, stagedAttendances });
    }
    this.setState(prevState => ({
      stagedAttendances: prevState.stagedAttendances.map(attendance => ({ ...attendance, presence: "PR" }))
    }));
  }

  render() {
    const { attendances, loaded } = this.props;
    const selectedDate = this.state.selectedDate || (loaded && Object.keys(attendances)[0]);
    const stagedAttendances = this.state.stagedAttendances || attendances[selectedDate];
    const { showAttendanceSaveSuccess, showSaveSpinner } = this.state;
    return (
      <React.Fragment>
        <h3 ref={this.attendanceTitle} className="section-detail-page-title">
          Attendance
        </h3>
        {loaded && (
          <React.Fragment>
            <div id="mentor-attendance">
              <div id="attendance-date-tabs-container">
                {Object.keys(attendances)
                  .sort(dateSort)
                  .map(date => (
                    <div
                      key={date}
                      className={date === selectedDate ? "active" : ""}
                      onClick={() => this.setState({ selectedDate: date, stagedAttendances: attendances[date] })}
                    >
                      {formatDate(date)}
                    </div>
                  ))}
              </div>
              <table id="mentor-attendance-table">
                <tbody>
                  {selectedDate &&
                    stagedAttendances.map(({ id, student, presence }) => (
                      <tr key={id}>
                        <td>{student.name}</td>
                        <td>
                          <select
                            value={presence}
                            name={id}
                            className="select-css"
                            style={{
                              backgroundColor: `var(--csm-attendance-${ATTENDANCE_LABELS[presence][1]})`
                            }}
                            onChange={this.handleAttendanceChange}
                          >
                            {Object.entries(ATTENDANCE_LABELS).map(([value, [label]]) => (
                              <option key={value} value={value} disabled={!value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div id="mentor-attendance-controls">
              <button className="csm-btn save-attendance-btn" onClick={this.handleSaveAttendance}>
                Save
              </button>
              <button className="mark-all-present-btn" onClick={this.handleMarkAllPresent}>
                Mark All As Present
              </button>
              {showSaveSpinner && <LoadingSpinner />}
              {showAttendanceSaveSuccess && <CheckCircle height="2em" width="2em" />}
            </div>
          </React.Fragment>
        )}
        {!loaded && <h5> Loading attendances...</h5>}
      </React.Fragment>
    );
  }
}

function zeroPadTwoDigit(num) {
  return num < 10 ? `0${num}` : num;
}

class SpacetimeEditModal extends React.Component {
  constructor(props) {
    super(props);
    // Time string comes as HH:MM:ss, TimeInput expects HH:MM
    const timeString = props.defaultSpacetime.startTime;
    // Some extra logic in case the API changes to HH:MM,
    // in which case split would produce 2 segments instead of 3
    const sliceIndex = timeString.split(":").length < 3 ? timeString.indexOf(":") : timeString.lastIndexOf(":");
    this.state = {
      location: props.defaultSpacetime.location,
      day: props.defaultSpacetime.dayOfWeek,
      time: timeString.slice(0, sliceIndex),
      isPermanent: false,
      changeDate: "",
      // Logic to determine whether or not the location is virtual or in person (same logic as backend to omit video call links)
      mode: props.defaultSpacetime.location.startsWith("http") ? "virtual" : "inperson",
      showSaveSpinner: false
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  static propTypes = {
    closeModal: PropTypes.func.isRequired,
    defaultSpacetime: SPACETIME_SHAPE.isRequired,
    reloadSection: PropTypes.func.isRequired
  };

  handleChange({ target: { name, value } }) {
    this.setState({ [name]: value });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { closeModal, defaultSpacetime, reloadSection } = this.props;
    const spacetimeId = defaultSpacetime.id;
    let { location, day, time, isPermanent, changeDate } = this.state;
    isPermanent = !!isPermanent;
    //TODO: Handle API failure
    this.setState({ showSaveSpinner: true });
    (isPermanent
      ? fetchWithMethod(`/spacetimes/${spacetimeId}/modify`, HTTP_METHODS.PUT, {
          day_of_week: day,
          location: location,
          start_time: `${time}:00`
        })
      : fetchWithMethod(`/spacetimes/${spacetimeId}/override`, HTTP_METHODS.PUT, {
          location: location,
          start_time: `${time}:00`,
          date: changeDate
        })
    ).then(() => {
      closeModal();
      reloadSection();
    });
  }

  render() {
    let { location, day, time, isPermanent, changeDate, mode, showSaveSpinner } = this.state;
    isPermanent = !!isPermanent;
    const now = new Date();
    const today = `${now.getFullYear()}-${zeroPadTwoDigit(now.getMonth() + 1)}-${zeroPadTwoDigit(now.getDate())}`;
    return (
      <Modal className="spacetime-edit-modal" closeModal={this.props.closeModal}>
        <form className="csm-form" id="spacetime-edit-form" onSubmit={this.handleSubmit}>
          <h4>Change Time and Location</h4>
          <div className="mode-selection">
            <label>Section is</label>
            <div className="mode-selection-options">
              <label>
                <input
                  onChange={this.handleChange}
                  type="radio"
                  name="mode"
                  value="inperson"
                  checked={mode === "inperson"}
                />
                In person
              </label>
              <label>
                <input
                  onChange={this.handleChange}
                  type="radio"
                  name="mode"
                  value="virtual"
                  checked={mode === "virtual"}
                />
                Virtual
              </label>
            </div>
          </div>
          <label>
            {mode === "inperson" ? "Location" : "Video Call Link"}
            <input
              onChange={this.handleChange}
              required
              title="You cannot leave this field blank"
              pattern=".*[^\s]+.*"
              type={mode === "inperson" ? "text" : "url"}
              maxLength="200"
              name="location"
              value={location}
              autoFocus
            />
          </label>
          {/* Would use a fieldset to be semantic, but Chrome has a bug where flexbox doesn't work for fieldset */}
          <div id="day-time-fields">
            <label>
              Day
              <select
                onChange={this.handleChange}
                required={isPermanent}
                name="day"
                disabled={!isPermanent}
                value={isPermanent ? day : ""}
              >
                {[["", "---"]].concat(DAYS_OF_WEEK).map(value => (
                  <option key={value} value={value} disabled={!value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Time
              <TimeInput onChange={this.handleChange} required name="time" value={time} />
            </label>
          </div>
          <div id="date-of-change-fields">
            <label>Change for</label>
            <label>
              <input
                onChange={this.handleChange}
                required
                type="radio"
                name="isPermanent"
                checked={isPermanent}
                value={true}
              />
              All sections
            </label>
            <label>
              {/* Need to use empty string as value so that it's falsey because the value is always interpreted as a string, using "false" would actually be a truthy value */}
              <input
                onChange={this.handleChange}
                required
                type="radio"
                name="isPermanent"
                checked={!isPermanent}
                value=""
              />
              <input
                onChange={this.handleChange}
                required={!isPermanent}
                type="date"
                min={today}
                name="changeDate"
                disabled={isPermanent}
                value={isPermanent ? "" : changeDate}
              />
            </label>
          </div>
          <div id="submit-and-status">
            {showSaveSpinner ? <LoadingSpinner /> : <input type="submit" value="Save" />}
          </div>
        </form>
      </Modal>
    );
  }
}

function MetaEditModal({ closeModal, sectionId, reloadSection, capacity, description }) {
  // use existing capacity and description as initial values
  const [formState, setFormState] = useState({ capacity: capacity, description: description });
  function handleChange({ target: { name, value } }) {
    setFormState(prevFormState => ({ ...prevFormState, [name]: value }));
  }
  function handleSubmit(event) {
    event.preventDefault();
    //TODO: Handle API Failure
    fetchWithMethod(`/sections/${sectionId}/`, HTTP_METHODS.PATCH, formState).then(() => {
      closeModal();
      reloadSection();
    });
  }
  return (
    <Modal closeModal={closeModal}>
      <form className="csm-form" onSubmit={handleSubmit}>
        <h4>Change Section Metadata</h4>
        <label>
          Capacity
          <input
            required
            name="capacity"
            type="number"
            min="0"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formState.capacity}
            onChange={handleChange}
            autoFocus
          />
        </label>
        <label>
          Description
          <input name="description" type="text" value={formState.description} onChange={handleChange} />
        </label>
        <input type="submit" value="Save" />
      </form>
    </Modal>
  );
}

MetaEditModal.propTypes = {
  sectionId: PropTypes.number.isRequired,
  closeModal: PropTypes.func.isRequired,
  reloadSection: PropTypes.func.isRequired,
  capacity: PropTypes.number.isRequired,
  description: PropTypes.string.isRequired
};

function MentorSectionInfo({
  students,
  loaded,
  spacetimes,
  reloadSection,
  isCoordinator,
  mentor,
  capacity,
  id,
  description
}) {
  const [showModal, setShowModal] = useState(MentorSectionInfo.MODAL_STATES.NONE);
  const [focusedSpacetimeID, setFocusedSpacetimeID] = useState(-1);
  const [userEmails, setUserEmails] = useState([]);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentError, setNewStudentError] = useState({});
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  useEffect(() => {
    if (!isCoordinator) {
      return;
    }
    fetchJSON("/users/").then(userEmails => setUserEmails(userEmails));
  }, [id, isCoordinator]);
  useEffect(() => {
    // reset error on section change
    setNewStudentEmail("");
    setNewStudentError({});
  }, [id]);
  const closeModal = () => setShowModal(MentorSectionInfo.MODAL_STATES.NONE);
  const closeAddModal = () => {
    setIsAddingStudent(false);
    reloadSection();
  };
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">{`${
        isCoordinator ? `${mentor.name || mentor.email}'s` : "My"
      } Section`}</h3>
      <div className="section-info-cards-container">
        <InfoCard title="Students">
          {loaded && (
            <React.Fragment>
              <table id="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {(students.length === 0 ? [{ name: "No students enrolled", id: -1 }] : students).map(
                    ({ name, email, id }) => (
                      <tr key={id}>
                        <td>
                          {isCoordinator && id !== -1 && (
                            <StudentDropper name={name} id={id} reloadSection={reloadSection} />
                          )}
                          <span className="student-info">{name || email}</span>
                        </td>
                      </tr>
                    )
                  )}
                  <React.Fragment>
                    <tr>
                      <td>
                        <button className="coordinator-email-modal-button" onClick={() => setIsAddingStudent(true)}>
                          Add students
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                  )}
                </tbody>
              </table>
              {newStudentError && (
                <div className="newStudentErrorContainer">
                  <span className="newStudentError">{newStudentError.error}</span>
                  {newStudentError.link && (
                    <NavLink className="newStudentLink" to={newStudentError.link}>
                      Link to existing section
                    </NavLink>
                  )}
                </div>
              )}
              {isCoordinator && isAddingStudent && (
                <CoordinatorAddStudentModal closeModal={closeAddModal} userEmails={userEmails} sectionId={id} />
              )}
            </React.Fragment>
          )}
          {!loaded && <LoadingSpinner />}
        </InfoCard>
        <div className="section-info-cards-right">
          {spacetimes.map(({ override, ...spacetime }, index) => (
            <SectionSpacetime
              manySpacetimes={spacetimes.length > 1}
              index={index}
              key={spacetime.id}
              spacetime={spacetime}
              override={override}
            >
              {showModal === MentorSectionInfo.MODAL_STATES.SPACETIME_EDIT && focusedSpacetimeID === spacetime.id && (
                <SpacetimeEditModal
                  key={spacetime.id}
                  reloadSection={reloadSection}
                  defaultSpacetime={spacetime}
                  closeModal={closeModal}
                />
              )}
              <button
                className="info-card-edit-btn"
                onClick={() => {
                  setShowModal(MentorSectionInfo.MODAL_STATES.SPACETIME_EDIT);
                  setFocusedSpacetimeID(spacetime.id);
                }}
              >
                <PencilIcon width="1em" height="1em" /> Edit
              </button>
            </SectionSpacetime>
          ))}

          <InfoCard title="Meta">
            {isCoordinator && (
              <React.Fragment>
                <button
                  className="info-card-edit-btn"
                  onClick={() => setShowModal(MentorSectionInfo.MODAL_STATES.META_EDIT)}
                >
                  <PencilIcon width="1em" height="1em" /> Edit
                </button>
                {showModal === MentorSectionInfo.MODAL_STATES.META_EDIT && (
                  <MetaEditModal
                    sectionId={id}
                    closeModal={closeModal}
                    reloadSection={reloadSection}
                    capacity={capacity}
                    description={description}
                  />
                )}
              </React.Fragment>
            )}
            <p>
              <span className="meta-field">Capacity:</span> {capacity}
            </p>
            <p>
              <span className="meta-field">Description:</span> {description}
            </p>
          </InfoCard>
        </div>
      </div>
    </React.Fragment>
  );
}

// Make MODAL_STATES the function-equivalent of a static class attribute on MentorSectionInfo
Object.defineProperty(MentorSectionInfo, "MODAL_STATES", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: Object.freeze({ NONE: "NONE", SPACETIME_EDIT: "SPACETIME_EDIT", META_EDIT: "META_EDIT" })
});

MentorSectionInfo.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      id: PropTypes.number.isRequired,
      email: PropTypes.string.isRequired
    })
  ).isRequired,
  loaded: PropTypes.bool.isRequired,
  spacetimes: PropTypes.arrayOf(SPACETIME_SHAPE),
  reloadSection: PropTypes.func.isRequired,
  isCoordinator: PropTypes.bool.isRequired,
  mentor: PropTypes.shape({ email: PropTypes.string.isRequired, name: PropTypes.string.isRequired }),
  capacity: PropTypes.number,
  description: PropTypes.string,
  id: PropTypes.number.isRequired
};

function CoordinatorAddStudentModal({ closeModal, userEmails, sectionId }) {
  const [emailsToAdd, setEmailsToAdd] = useState([""]);
  const [response, setResponse] = useState({});
  /**
   * Mapping from email to action for what the user replies with after the first submission
   */
  const [responseActions, setResponseActions] = useState(new Map());
  const [addStage, setAddStage] = useState(CoordinatorAddStudentModal.STATES.INITIAL);
  /**
   * Whether or not the form fields should be highlighted if invalid
   */
  const [validationEnabled, setValidationEnabled] = useState(false);

  function setEmail(index, value) {
    let newEmailsToAdd = [...emailsToAdd];
    newEmailsToAdd[index] = value;
    setEmailsToAdd(newEmailsToAdd);
  }

  function addNewEmail() {
    setEmailsToAdd([...emailsToAdd, ""]);
  }

  function addEmailsFromClipboard() {
    // this will error with a DOMException if clipboard access is denied
    navigator.clipboard.readText().then(text => {
      setEmailsToAdd(lastEmails => {
        if (lastEmails.length == 1 && lastEmails[0] === "") {
          // just the initial value, so overwrite it
          lastEmails = [];
        }
        return [...lastEmails, ...text.split(/\s+/g)];
      });
    });
  }

  function removeEmailByIndex(index) {
    let newEmailsToAdd = [...emailsToAdd];
    newEmailsToAdd.splice(index, 1);
    setEmailsToAdd(newEmailsToAdd);
  }

  function removeResponseEmail(email) {
    setEmailsToAdd(emailsToAdd.filter(item => item !== email));
    setResponse(lastResponse => ({
      ...lastResponse,
      progress: lastResponse.progress.filter(email_obj => email_obj.email !== email)
    }));
  }

  function handleAddStudentSubmit(e) {
    e.preventDefault(); // prevent refresh on submit, which stops this request
    setAddStage(CoordinatorAddStudentModal.STATES.LOADING);

    let request_emails = emailsToAdd.map(email => {
      let action = {};
      if (responseActions.has(email)) {
        action = responseActions.get(email);
      }
      return { email: email, ...action };
    });

    if (request_emails.length == 0) {
      // no student emails to add, so just exit
      closeModal();
      return;
    }

    let request = { emails: request_emails, actions: {} };
    if (responseActions.has("capacity")) {
      request.actions["capacity"] = responseActions.get("capacity");
    }

    fetchWithMethod(`sections/${sectionId}/students/`, HTTP_METHODS.PUT, request).then(response => {
      if (!response.ok) {
        if (response.status === 500) {
          // internal error
          response.text().then(() => {
            setResponse({
              errors: { critical: `A internal error occurred. Please report this error to #tech-bugs immediately.` }
            });
            setAddStage(CoordinatorAddStudentModal.STATES.ERROR);
          });
        } else {
          response.json().then(body => {
            setResponse(body);
            if (body.errors.critical) {
              setAddStage(CoordinatorAddStudentModal.STATES.ERROR);
            } else {
              setAddStage(CoordinatorAddStudentModal.STATES.WARNING);
            }
          });
        }
        setValidationEnabled(false); // reset validation
      } else {
        closeModal();
      }
    });
  }

  function updateResponseAction(e, email, field) {
    let newAction = {};
    if (responseActions.has(email)) {
      newAction = responseActions.get(email);
    }

    if (e.target.checked) {
      newAction[field] = e.target.value;
    } else {
      delete newAction[field];
    }

    let newResponseActions = new Map(responseActions);
    newResponseActions.set(email, newAction);
    setResponseActions(newResponseActions);
  }

  function updateGeneralResponseAction(e, field) {
    let newResponseActions = new Map(responseActions);
    if (e.target.checked) {
      newResponseActions.set(field, e.target.value);
    } else {
      newResponseActions.delete(field);
    }
    setResponseActions(newResponseActions);
  }

  const initial_component = (
    <React.Fragment>
      <h4>Add new students</h4>
      <div className="coordinator-email-content">
        <div className="coordinator-email-input-list">
          {emailsToAdd.map((email, index) => (
            <div className="coordinator-email-input-item" key={index}>
              <span className="inline-plus-sign ban-cancel" onClick={() => removeEmailByIndex(index)}>
                ×
              </span>
              <input
                className={"coordinator-email-input" + (validationEnabled ? "" : " lock-validation")}
                type="email"
                required
                pattern=".+@berkeley.edu$"
                title="Please enter a valid @berkeley.edu email address"
                placeholder="New student's email"
                list="user-emails-list"
                value={email}
                onChange={({ target: { value } }) => setEmail(index, value)}
              />
            </div>
          ))}
          <datalist id="user-emails-list">
            {userEmails.map(email => (
              <option key={email} value={email} />
            ))}
          </datalist>
        </div>
      </div>
      <div className="coordinator-email-input-buttons">
        <button className="coordinator-email-input-add" onClick={() => addNewEmail()}>
          Add email
        </button>
        {
          /* Firefox doesn't support clipboard reads from sites; readText would be undefined */
          navigator.clipboard.readText && (
            <button className="coordinator-email-input-add" onClick={() => addEmailsFromClipboard()}>
              Add from clipboard
            </button>
          )
        }
        <button className="coordinator-email-input-submit" type="submit" onClick={() => setValidationEnabled(true)}>
          Submit
        </button>
      </div>
    </React.Fragment>
  );

  const loading_component = (
    <React.Fragment>
      <h4>Add new students</h4>
      <LoadingSpinner />
      <div></div> {/* empty element to align the content */}
    </React.Fragment>
  );

  const ADD_STATUS = {
    OK: "OK",
    CONFLICT: "CONFLICT",
    BANNED: "BANNED"
  };

  let ok_arr = [];
  let conflict_arr = [];
  let banned_arr = [];

  if (response && response.progress) {
    for (let email_obj of response.progress) {
      switch (email_obj.status) {
        case ADD_STATUS.OK:
          ok_arr.push(email_obj);
          break;
        case ADD_STATUS.CONFLICT:
          conflict_arr.push(email_obj);
          break;
        case ADD_STATUS.BANNED:
          banned_arr.push(email_obj);
          break;
      }
    }
  }

  const warning_component = (
    <React.Fragment>
      <h4>Add new students</h4>
      <div className="coordinator-email-content">
        <div className="coordinator-email-response-list">
          {conflict_arr.length > 0 && (
            <div className="coordinator-email-response-container">
              <div className="coordinator-email-response-head">
                <div className="coordinator-email-response-head-left coordinator-email-response-status-conflict">
                  <ErrorCircle className="coordinator-email-response-status-conflict-icon" />
                  Section conflict
                </div>
                <div className="coordinator-email-response-head-right">
                  <div className="coordinator-email-reaponse-head-right-item">Drop?</div>
                </div>
              </div>
              <div className="coordinator-email-response-item-container">
                {conflict_arr.map(email_obj => {
                  let conflictDetail = "";
                  let drop_disabled = false;
                  if (!email_obj.detail.section) {
                    // look at reason
                    if (!email_obj.detail.reason || email_obj.detail.reason === "other") {
                      // unknown reason
                      conflictDetail = "Unable to enroll user in section!";
                    } else if (email_obj.detail.reason === "coordinator") {
                      conflictDetail = "User is already a coordinator for the course!";
                    } else if (email_obj.detail.reason === "mentor") {
                      conflictDetail = "User is already a mentor for the course!";
                    }
                    drop_disabled = true;
                  } else if (email_obj.detail.section.id == sectionId) {
                    conflictDetail = "Already enrolled!";
                    drop_disabled = true;
                  } else {
                    conflictDetail = `Conflict: ${email_obj.detail.section.mentor.name} (id ${email_obj.detail.section.id})`;
                  }
                  return (
                    <div key={email_obj.email} className="coordinator-email-response-item">
                      <div className="coordinator-email-response-item-left">
                        <div className="coordinator-email-response-item-left-email">
                          <span
                            className="inline-plus-sign ban-cancel"
                            onClick={() => removeResponseEmail(email_obj.email)}
                          >
                            ×
                          </span>
                          {email_obj.email}
                        </div>
                        <div className="coordinator-email-response-item-left-detail">{conflictDetail}</div>
                      </div>
                      <div className="coordinator-email-response-item-right">
                        <input
                          type="checkbox"
                          value="DROP"
                          disabled={drop_disabled}
                          onChange={e => updateResponseAction(e, email_obj.email, "conflict_action")}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {banned_arr.length > 0 && (
            <div className="coordinator-email-response-container">
              <div className="coordinator-email-response-head">
                <div className="coordinator-email-response-head-left coordinator-email-response-status-banned">
                  <ErrorCircle className="coordinator-email-response-status-conflict-icon" />
                  Student banned
                </div>
                <div className="coordinator-email-response-head-right">
                  <div className="coordinator-email-reaponse-head-right-item">
                    Unban,
                    <br /> Enroll
                  </div>
                  <div className="coordinator-email-reaponse-head-right-item">
                    Unban,
                    <br /> No Enroll
                  </div>
                </div>
              </div>
              <div className="coordinator-email-response-item-container">
                {banned_arr.map(email_obj => (
                  <div key={email_obj.email} className="coordinator-email-response-item">
                    <div className="coordinator-email-response-item-left">
                      <div className="coordinator-email-response-item-left-email">
                        <span
                          className="inline-plus-sign ban-cancel"
                          onClick={() => removeResponseEmail(email_obj.email)}
                        >
                          ×
                        </span>
                        {email_obj.email}
                      </div>
                    </div>
                    <div className="coordinator-email-response-item-right">
                      <input
                        type="radio"
                        name={`unban-${email_obj.email}`}
                        value="UNBAN_ENROLL"
                        onChange={e => updateResponseAction(e, email_obj.email, "ban_action")}
                      />
                      <input
                        type="radio"
                        name={`unban-${email_obj.email}`}
                        value="UNBAN_SKIP"
                        onChange={e => updateResponseAction(e, email_obj.email, "ban_action")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ok_arr.length > 0 && (
            <div className="coordinator-email-response-container">
              <div className="coordinator-email-response-head">
                <div className="coordinator-email-response-head-left coordinator-email-response-status-ok">
                  <CheckCircle className="coordinator-email-response-status-ok-icon" />
                  OK
                </div>
                <div className="coordinator-email-response-head-right"></div>
              </div>
              <div className="coordinator-email-response-item-container">
                {ok_arr.map(email_obj => (
                  <div key={email_obj.email} className="coordinator-email-response-item">
                    <div className="coordinator-email-response-item-left">
                      <span
                        className="inline-plus-sign ban-cancel"
                        onClick={() => removeResponseEmail(email_obj.email)}
                      >
                        ×
                      </span>
                      {email_obj.email}
                    </div>
                    <div className="coordinator-email-response-item-right"></div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {response && response.errors && response.errors.capacity && (
            <div className="coordinator-email-response-capacity-container">
              <hr className="coordinator-email-response-hr" />
              <div className="coordinator-email-response-email-status">
                <div className="coordinator-email-response-capacity">
                  <ErrorCircle className="coordinator-email-response-status-conflict-icon" />
                  Section capacity exceeded!
                </div>
              </div>
              <div className="coordinator-email-response-form">
                <label>
                  <input
                    type="radio"
                    name="capacity"
                    value="EXPAND"
                    onChange={e => updateGeneralResponseAction(e, "capacity")}
                  />
                  Enroll and expand section
                </label>
                <label>
                  <input
                    type="radio"
                    name="capacity"
                    value="SKIP"
                    onChange={e => updateGeneralResponseAction(e, "capacity")}
                  />
                  Ignore (delete students manually)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="coordinator-email-input-buttons">
        <button className="coordinator-email-input-submit" type="submit" onClick={() => setValidationEnabled(true)}>
          Retry
        </button>
      </div>
    </React.Fragment>
  );

  const error_component = (
    <React.Fragment>
      <h4 className="internal-error-title">Internal Error</h4>
      <div className="internal-error-body">{response && response.errors && response.errors.critical}</div>
      <div>Timestamp: {`${new Date()}`}</div>
    </React.Fragment>
  );

  let curContents = "";
  if (addStage === CoordinatorAddStudentModal.STATES.INITIAL) {
    curContents = initial_component;
  } else if (addStage === CoordinatorAddStudentModal.STATES.LOADING) {
    curContents = loading_component;
  } else if (addStage === CoordinatorAddStudentModal.STATES.ERROR) {
    curContents = error_component;
  } else if (addStage === CoordinatorAddStudentModal.STATES.WARNING) {
    curContents = warning_component;
  }

  return (
    <Modal className="coordinator-add-student-modal" closeModal={closeModal}>
      <form
        id="coordinator-add-student-form"
        className="coordinator-add-student-modal-contents"
        onSubmit={handleAddStudentSubmit}
      >
        {curContents}
      </form>
    </Modal>
  );
}

Object.defineProperty(CoordinatorAddStudentModal, "STATES", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: Object.freeze({ INITIAL: "INITIAL", WARNING: "WARNING", ERROR: "ERROR", LOADING: "LOADING" })
});

CoordinatorAddStudentModal.propTypes = {
  closeModal: PropTypes.func.isRequired,
  userEmails: PropTypes.array.isRequired,
  sectionId: PropTypes.number.isRequired
};

function StudentDropper({ id, reloadSection }) {
  const [showBanPrompt, setShowBanPrompt] = useState(false);
  function handleClickDrop(banned) {
    fetchWithMethod(`students/${id}/drop`, HTTP_METHODS.PATCH, { banned }).then(() => reloadSection());
  }
  return (
    <span className={`student-dropper ${showDropPrompt ? "ban-prompt-visible" : ""}`}>
      <span title="Drop student from section" className="inline-plus-sign" onClick={() => setShowDropPrompt(true)}>
        ×
      </span>
      {showDropPrompt && (
        <Modal closeModal={() => setShowDropPrompt(false)}>
          <div className="studentDropper">
            <div className="studentDropperHeadItem">DROP Student</div>
            <div>
              <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
              <label className="studentDropperCheckboxLabel" htmlFor="drop">
                I would like to DROP {name} from this section.
              </label>
              <br></br>
            </div>
            <div className="studentDropperHeadItem">BAN Student</div>
            <div>
              <input type="checkbox" id="ban" name="ban" onChange={e => setBan(e.target.checked)} disabled={!drop} />
              <label className="studentDropperCheckboxLabel" htmlFor="ban">
                I would like to BAN {name} from this course.
              </label>
              <br></br>
            </div>
            <div className="studentDropperSubmitWrapper">
              <button
                className="studentDropperSubmit"
                id="dropper submit button"
                onClick={handleClickDrop}
                disabled={!drop}
              >
                Submit
              </button>
            </div>
          </div>
        </Modal>
      )}
    </span>
  );
}

StudentDropper.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  reloadSection: PropTypes.func.isRequired
};

function MentorSectionRoster({ students, loaded }) {
  const [emailsCopied, setEmailsCopied] = useState(false);
  const handleCopyEmails = () => {
    navigator.clipboard.writeText(students.map(({ email }) => email).join("\n")).then(() => {
      setEmailsCopied(true);
      setTimeout(() => setEmailsCopied(false), 1500);
    });
  };
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">Roster</h3>
      {loaded && (
        <table className="standalone-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>
                <CopyIcon id="copy-student-emails" height="1em" width="1em" onClick={handleCopyEmails} />
                {emailsCopied && <CheckCircle id="copy-student-emails-success" height="1em" width="1em" />}
              </th>
            </tr>
          </thead>
          <tbody>
            {students.map(({ name, email, id }) => (
              <tr key={id}>
                <td>{name}</td>
                <td>{email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loaded && <LoadingSpinner />}
    </React.Fragment>
  );
}

MentorSectionRoster.propTypes = {
  students: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired
    })
  ).isRequired,
  loaded: PropTypes.bool.isRequired
};
