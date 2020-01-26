import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import { SectionDetail, InfoCard, SectionSpacetime } from "./Section";
import { Switch, Route } from "react-router-dom";
import { groupBy } from "lodash";
import CopyIcon from "../../static/frontend/img/copy.svg";
import CheckCircle from "../../static/frontend/img/check_circle.svg";
import { ATTENDANCE_LABELS } from "./Section";
export default function MentorSection({ id, url, course, courseTitle, spacetime, override }) {
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
            <MentorSectionInfo students={students} loaded={loaded} spacetime={spacetime} override={override} />
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
  url: PropTypes.string.isRequired
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
              {showAttendanceSaveSuccess && <CheckCircle color="green" height="2em" width="2em" />}
            </div>
          </React.Fragment>
        )}
        {!loaded && <h5> Loading attendances...</h5>}
      </React.Fragment>
    );
  }
}

function MentorSectionInfo({ students, loaded, spacetime, override }) {
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
        <SectionSpacetime spacetime={spacetime} override={override} />
      </div>
    </React.Fragment>
  );
}

MentorSectionInfo.propTypes = {
  students: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string.isRequired, id: PropTypes.number.isRequired }))
    .isRequired,
  loaded: PropTypes.bool.isRequired,
  spacetime: PropTypes.object.isRequired,
  override: PropTypes.object
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
                {emailsCopied && (
                  <CheckCircle id="copy-student-emails-success" color="green" height="1em" width="1em" />
                )}
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
