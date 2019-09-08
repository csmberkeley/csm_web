import React from "react";
import PropTypes from "prop-types";
import moment from "moment";
import { HTTP_METHODS, fetchWithMethod } from "../utils/api";

const attendanceShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  presence: PropTypes.string.isRequired,
  weekStart: PropTypes.string.isRequired
});

// Map instead of object prserves order
const PRESENCE_OPTIONS = new Map([["PR", "Present"], ["UN", "Unexcused Absence"], ["EX", "Excused Absence"]]);

const EMPTY_PRESENCE_OPTION = "---";

function updateAttendance(studentId, date, presence) {
  return fetchWithMethod(`students/${studentId}/attendances/`, HTTP_METHODS.PUT, {
    presence: presence,
    date: date
  });
}

/**
 * Displays attendance for a week. Uneditable.
 */
export class AsStudentAttendance extends React.Component {
  static propTypes = {
    attendances: PropTypes.arrayOf(attendanceShape).isRequired
  };

  render() {
    return (
      <table>
        <tbody>
          {this.props.attendances.length == 0 ? (
            <tr>
              <td>No attendances yet.</td>
            </tr>
          ) : (
            this.props.attendances.map(attendance => (
              <tr key={attendance.weekStart}>
                <td>Week of {attendance.weekStart}</td>
                <td>{PRESENCE_OPTIONS[attendance.presence]}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  }
}

const AttendanceUpdateState = Object.freeze({
  NOT_UPDATING: 0,
  UPDATING: 1,
  FAILURE: 2,
  SUCCESS: 3
});

/**
 * A fragment containing <td>s for the name and presence of an attendance.
 */
class WeekAttendanceFragment extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      presence: props.presence,
      updating: AttendanceUpdateState.NOT_UPDATING
    };
    this.handleInputChange = this.handleInputChange.bind(this);
  }

  static propTypes = {
    student: PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired
    }).isRequired,
    date: PropTypes.string.isRequired,
    presence: PropTypes.string
  };

  handleInputChange(event) {
    const { value } = event.target;
    this.setState({
      updating: false,
      presence: value
    });
    let date = moment(parseInt(this.props.date));
    let dateString = date.format("YYYY-MM-DD");
    // TODO distinguish between request success and failure
    updateAttendance(this.props.student.id, dateString, value);
  }

  render() {
    return (
      <React.Fragment>
        <td>{this.props.student.name}</td>
        <td>
          <select value={this.state.presence || EMPTY_PRESENCE_OPTION} onChange={this.handleInputChange}>
            <option value="">{EMPTY_PRESENCE_OPTION}</option>
            {Array.from(PRESENCE_OPTIONS.keys()).map(pr => (
              <option key={pr} value={pr}>
                {PRESENCE_OPTIONS.get(pr)}
              </option>
            ))}
          </select>
        </td>
      </React.Fragment>
    );
  }
}

export class AsMentorAttendance extends React.Component {
  constructor(props) {
    super(props);
    // Python day of week starts on Monday, but JS day of week starts on Sunday
    let date = moment();
    // May be buggy on Sundays? honestly not really sure
    let offset = date.day() === 0 ? -6 : 1;
    let lastWeekStart = date.add(offset - 7);

    // Groups attendances by the week start parsed from the string returned by the API
    // Then maps student names to presence in that week
    let attendancesByDate = {};
    let students = [];
    let maxDate = moment(0);
    for (let student of props.students) {
      students.push({
        id: student.id,
        name: student.name,
        email: student.email
      });
      for (let attendance of student.attendances) {
        let weekStart = moment(attendance.weekStart).valueOf();
        if (!(weekStart in attendancesByDate)) {
          attendancesByDate[weekStart] = {};
        }
        attendancesByDate[weekStart][student.id] = attendance.presence;
        if (weekStart > maxDate) {
          maxDate = weekStart;
        }
      }
    }
    // Generate attendance list to be rendered
    // Each element should contain { date: Date, attendances: {[Student]: string?} }
    let attendanceList = [];
    for (let date in attendancesByDate) {
      // Could do an ordered insert, but I'm lazy
      attendanceList.push({ date: date, attendances: attendancesByDate[date] });
    }
    attendanceList.sort((a, b) => a.date - b.date);
    let behindOnAttendance = maxDate < lastWeekStart;
    this.state = {
      behindOnAttendance: behindOnAttendance,
      attendances: attendanceList,
      students: students
    };
  }

  static propTypes = {
    students: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        email: PropTypes.string.isRequired,
        attendances: PropTypes.arrayOf(attendanceShape).isRequired
      })
    ).isRequired
  };

  render() {
    return (
      <table>
        <tbody>
          {this.state.attendances.map(({ date, attendances }) =>
            // TODO add one more <td> for the most recent unrecorded week, maybe with state.behindOnATtendance
            this.state.students.map((student, i) => {
              let presence = attendances[student.id];
              return (
                <tr key={date + student.id.toString()}>
                  <td>{i === 0 && `Week of ${moment(parseInt(date)).format("M/D/Y")}`}</td>
                  <WeekAttendanceFragment student={student} presence={presence} date={date} />
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    );
  }
}
