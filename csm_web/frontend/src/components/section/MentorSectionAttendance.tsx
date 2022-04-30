import React, { useState, useEffect } from "react";
import { useUpdateStudentAttendancesMutation, useUpdateWordOfTheDayMutation } from "../../utils/queries/sections";
import LoadingSpinner from "../LoadingSpinner";
import { ATTENDANCE_LABELS } from "./Section";
import { dateSort, formatDate } from "./utils";
import { Attendance } from "../../utils/types";
import randomWords from "random-words";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";

interface MentorSectionAttendanceProps {
  sectionId: number;
  loaded: boolean;
  attendances: {
    [date: string]: Attendance[];
  };
  updateAttendance: (updatedDate: string, updatedDateAttendances: Attendance[]) => void;
}

const MentorSectionAttendance = ({
  sectionId,
  loaded,
  attendances,
  updateAttendance
}: MentorSectionAttendanceProps): React.ReactElement => {
  const [selectedDate, setSelectedDate] = useState(loaded ? Object.keys(attendances).sort(dateSort)[0] : undefined);
  const [stagedAttendances, setStagedAttendances] = useState(loaded ? attendances[selectedDate!] : undefined);
  const [showAttendanceSaveSuccess, setShowAttendanceSaveSuccess] = useState(false);
  const [showSaveSpinner, setShowSaveSpinner] = useState(false);

  const updateStudentAttendancesMutation = useUpdateStudentAttendancesMutation(sectionId);
  const updateWordOfTheDayMutation = useUpdateWordOfTheDayMutation(sectionId);
  const [wordOfTheDay, setWordOfTheDay] = useState("");

  useEffect(() => {
    if (loaded) {
      const newSelectedDate = Object.keys(attendances).sort(dateSort)[0];
      setSelectedDate(newSelectedDate);
      setStagedAttendances(attendances[newSelectedDate]);
    }
  }, [loaded]);

  function handleAttendanceChange({ target: { name: id, value } }: React.ChangeEvent<HTMLSelectElement>): void {
    const newStagedAttendances = stagedAttendances || Object.values(attendances)[0];
    setStagedAttendances(
      newStagedAttendances.map(attendance =>
        attendance.id == Number(id) ? { ...attendance, presence: value } : attendance
      )
    );
  }

  function handleSaveAttendance() {
    if (!stagedAttendances) {
      return;
    }
    setShowSaveSpinner(true);
    // TODO: Handle API Failure
    updateStudentAttendancesMutation.mutate(
      {
        attendances: stagedAttendances.map(({ id: attendanceId, presence, student: { id: studentId } }) => ({
          attendanceId,
          presence,
          studentId
        }))
      },
      {
        onSuccess: () => {
          updateAttendance(selectedDate!, stagedAttendances);
          setShowAttendanceSaveSuccess(true);
          setShowSaveSpinner(false);
          setTimeout(() => setShowAttendanceSaveSuccess(false), 1500);
        }
      }
    );
  }

  function handleMarkAllPresent() {
    if (!stagedAttendances) {
      const [newSelectedDate, newStagedAttendances] = Object.entries(attendances)[0];
      setSelectedDate(newSelectedDate);
      setStagedAttendances(newStagedAttendances);
    }
    setStagedAttendances(stagedAttendances!.map(attendance => ({ ...attendance, presence: "PR" })));
  }

  function handleGenerateWord() {
    if (selectedDate && wordOfTheDay) {
      updateWordOfTheDayMutation.mutate({ wordOfTheDay });
    }
  }

  function handlePickRandomWord() {
    setWordOfTheDay(randomWords());
  }

  return (
    <div className="mentor-attendance-page">
      <h3 className="section-detail-page-title">Attendance</h3>
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
                    onClick={() => {
                      setSelectedDate(date);
                      setStagedAttendances(attendances[date]);
                    }}
                  >
                    {formatDate(date)}
                  </div>
                ))}
            </div>
            <table id="mentor-attendance-table">
              <tbody>
                {selectedDate &&
                  stagedAttendances!.map(({ id, student, presence }) => (
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
                          onChange={handleAttendanceChange}
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
            <div id="mentor-attendance-controls">
              <button className="csm-btn save-attendance-btn" onClick={handleSaveAttendance}>
                Save
              </button>
              <button className="mark-all-present-btn" onClick={handleMarkAllPresent}>
                Mark All As Present
              </button>
              {showSaveSpinner && <LoadingSpinner />}
              {showAttendanceSaveSuccess && <CheckCircle height="2em" width="2em" />}
            </div>
          </div>
        </React.Fragment>
      )}
      {!loaded && <LoadingSpinner />}
      <div id="word-of-the-day-container">
        <h3 className="section-detail-page-title">Word of the Day</h3>
        <h4>Create a word of the day or use a random one!</h4>
        <h4 className="word-of-the-day-text">
          <span className="word-of-the-day-date">{selectedDate && formatDate(selectedDate)}</span>
          {"   "}Status:{"   "}
          <span className="word-of-the-day-status">Not Chosen</span>
        </h4>
        <input
          className="word-of-the-day-input"
          type="text"
          placeholder="Word of the Day"
          value={wordOfTheDay}
          onChange={e => {
            setWordOfTheDay(e.target.value);
          }}
        ></input>
        <button className="random-word-picker-btn" onClick={handlePickRandomWord}>
          Random Word
        </button>
        <button className="csm-btn generate-word-btn" onClick={handleGenerateWord}>
          Submit
        </button>
      </div>
    </div>
  );
};

export default MentorSectionAttendance;
