import React from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner";
import { ATTENDANCE_LABELS } from "../Section";
import { dateSort, formatDate } from "./utils";
import { Attendance } from "../../utils/types";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";

interface MentorSectionAttendanceProps {
  loaded: boolean;
  attendances: {
    [date: string]: Attendance[];
  };
  updateAttendance: (updatedDate: string, updatedDateAttendances: Attendance[]) => void;
}

interface MentorSectionAttendanceState {
  selectedDate: string;
  stagedAttendances: Attendance[];
  showAttendanceSaveSuccess: boolean;
  showSaveSpinner: boolean;
}

export default class MentorSectionAttendance extends React.Component<
  MentorSectionAttendanceProps,
  MentorSectionAttendanceState
> {
  attendanceTitle: React.RefObject<HTMLHeadingElement>;

  constructor(props: MentorSectionAttendanceProps) {
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
    this.attendanceTitle = React.createRef<HTMLHeadingElement>();
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
                            name={String(id)}
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
