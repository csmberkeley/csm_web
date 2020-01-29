import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import { SectionDetail, InfoCard, SectionSpacetime } from "./Section";
import { Switch, Route } from "react-router-dom";
import { groupBy } from "lodash";
import CopyIcon from "../../static/frontend/img/copy.svg";
import CheckCircle from "../../static/frontend/img/check_circle.svg";
import PencilIcon from "../../static/frontend/img/pencil.svg";
import { ATTENDANCE_LABELS } from "./Section";
import Modal from "./Modal";
export default function MentorSection({ id, url, course, courseTitle, spacetime, override, reloadSection }) {
  const [{ students, attendances, loaded }, setState] = useState({ students: [], attendances: {}, loaded: false });
  useEffect(() => {
    setState({ students: [], attendances: {}, loaded: false });
    fetchJSON(`/sections/${id}/students/`).then(data => {
      const students = data.map(({ name, email, id }) => ({ name, email, id }));
      const attendances = groupBy(
        data
          .flatMap(({ name, id, attendances }) =>
            attendances.map(attendance => ({ ...attendance, student: { name, id } }))
          )
          .reverse(),
        attendance => attendance.weekStart
      );
      setState({ students, attendances, loaded: true });
    });
  }, [id]);

  const updateAttendance = (updatedWeek, updatedWeekAttendances) => {
    const updatedAttendances = Object.fromEntries(
      Object.entries(attendances).map(([weekStart, weekAttendances]) => [
        weekStart,
        weekStart == updatedWeek ? [...updatedWeekAttendances] : weekAttendances
      ])
    );
    setState({ students, loaded, attendances: updatedAttendances });
  };

  return (
    <SectionDetail
      course={course}
      courseTitle={courseTitle}
      isStudent={false}
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
              reloadSection={reloadSection}
              students={students}
              loaded={loaded}
              spacetime={spacetime}
              override={override}
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
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object,
  url: PropTypes.string.isRequired,
  reloadSection: PropTypes.func.isRequired
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

const DAYS_OF_WEEK = Object.freeze({
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday"
});

function formatDate(dateString) {
  /*
   * Example:
   * formatDate("Jan. 6, 2020") --> "1/6"
   */
  const [month, dayAndYear] = dateString.split(".");
  const day = dayAndYear.split(",")[0].trim();
  return `${MONTH_NUMBERS[month]}/${day}`;
}

function LoadingSpinner() {
  return (
    <div className="sk-fading-circle">
      {[...Array(12)].map((_, i) => (
        <div key={i} className={`sk-circle${i + 1} sk-circle`} />
      ))}
    </div>
  );
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
      selectedWeek: null,
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
    const { stagedAttendances, selectedWeek } = this.state;
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
      this.props.updateAttendance(selectedWeek, stagedAttendances);
      this.setState({ showAttendanceSaveSuccess: true, showSaveSpinner: false });
      setTimeout(() => this.setState({ showAttendanceSaveSuccess: false }), 1500);
    });
  }

  handleMarkAllPresent() {
    if (!this.state.stagedAttendances) {
      const [selectedWeek, stagedAttendances] = Object.entries(this.props.attendances)[0];
      this.setState({ selectedWeek, stagedAttendances });
    }
    this.setState(prevState => ({
      stagedAttendances: prevState.stagedAttendances.map(attendance => ({ ...attendance, presence: "PR" }))
    }));
  }

  render() {
    const { attendances, loaded } = this.props;
    const selectedWeek = this.state.selectedWeek || (loaded && Object.keys(attendances)[0]);
    const stagedAttendances = this.state.stagedAttendances || attendances[selectedWeek];
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
                {Object.keys(attendances).map(weekStart => (
                  <div
                    key={weekStart}
                    className={weekStart === selectedWeek ? "active" : ""}
                    onClick={() =>
                      this.setState({ selectedWeek: weekStart, stagedAttendances: attendances[weekStart] })
                    }
                  >
                    {formatDate(weekStart)}
                  </div>
                ))}
              </div>
              <table id="mentor-attendance-table">
                <tbody>
                  {selectedWeek &&
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
                              <option key={value} value={value}>
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
    this.state = { location: "", day: "", time: "", isPermanent: false, changeDate: "", showSaveSpinner: false };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  static propTypes = {
    closeModal: PropTypes.func.isRequired,
    spacetimeId: PropTypes.number.isRequired,
    reloadSection: PropTypes.func.isRequired
  };

  handleChange({ target: { name, value } }) {
    this.setState({ [name]: value });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { closeModal, spacetimeId, reloadSection } = this.props;
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
    let { location, day, time, isPermanent, changeDate, showSaveSpinner } = this.state;
    isPermanent = !!isPermanent;
    const now = new Date();
    const today = `${now.getFullYear()}-${zeroPadTwoDigit(now.getMonth() + 1)}-${zeroPadTwoDigit(now.getDate())}`;
    return (
      <Modal className="spacetime-edit-modal" closeModal={this.props.closeModal}>
        <form id="spacetime-edit-form" onSubmit={this.handleSubmit}>
          <h4>Change Time and Location</h4>
          <label>
            Location
            <input
              onChange={this.handleChange}
              required
              title="You cannot leave this field blank"
              pattern=".*[^\s]+.*"
              type="text"
              name="location"
              value={location}
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
                {Object.entries(DAYS_OF_WEEK)
                  .concat([["", "---"]])
                  .map(([value, label]) => (
                    <option key={value} value={value} disabled={!value}>
                      {label}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Time
              <input onChange={this.handleChange} required type="time" name="time" value={time} />
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

function MentorSectionInfo({ students, loaded, spacetime, override, reloadSection }) {
  const [showModal, setShowModal] = useState(false);
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">My Section</h3>
      <div className="section-info-cards-container">
        <InfoCard title="Students">
          {loaded && (
            <table id="students-table">
              <thead>
                <tr>
                  <th>Name</th>
                </tr>
              </thead>
              <tbody>
                {students.map(({ name, id }) => (
                  <tr key={id}>
                    <td>{name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loaded && <h5>Loading students...</h5>}
        </InfoCard>
        <SectionSpacetime spacetime={spacetime} override={override}>
          {showModal && (
            <SpacetimeEditModal
              reloadSection={reloadSection}
              spacetimeId={spacetime.id}
              closeModal={() => setShowModal(false)}
            />
          )}
          <button className="spacetime-edit-btn" onClick={() => setShowModal(true)}>
            <PencilIcon width="1em" height="1em" /> Edit
          </button>
        </SectionSpacetime>
      </div>
    </React.Fragment>
  );
}

MentorSectionInfo.propTypes = {
  students: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string.isRequired, id: PropTypes.number.isRequired }))
    .isRequired,
  loaded: PropTypes.bool.isRequired,
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object,
  reloadSection: PropTypes.func.isRequired
};

function MentorSectionRoster({ students, loaded }) {
  const [emailsCopied, setEmailsCopied] = useState(false);
  const handleCopyEmails = () => {
    navigator.clipboard.writeText(students.map(({ email }) => email).join(" ")).then(() => {
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
      {!loaded && <h5>Loading roster...</h5>}
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
