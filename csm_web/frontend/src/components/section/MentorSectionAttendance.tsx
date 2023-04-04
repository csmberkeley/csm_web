import React, { useState, useEffect } from "react";
import {
  useSectionAttendances,
  useUpdateStudentAttendancesMutation,
  useUpdateWordOfTheDayMutation,
  useWordOfTheDay
} from "../../utils/queries/sections";
import LoadingSpinner from "../LoadingSpinner";
import { ATTENDANCE_LABELS } from "./Section";
import { dateSortISO, formatDateISO } from "./utils";
import { Attendance } from "../../utils/types";
import randomWords from "random-words";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";

interface MentorSectionAttendanceProps {
  sectionId: number;
}

interface SectionOccurrence {
  id: number;
  date: string;
}

enum ResponseStatus {
  NONE,
  LOADING,
  OK
}

const MentorSectionAttendance = ({ sectionId }: MentorSectionAttendanceProps): React.ReactElement => {
  const { data: jsonAttendances, isSuccess: jsonAttendancesLoaded } = useSectionAttendances(sectionId);
  const { data: wotd, isSuccess: wotdLoaded, isError: wotdError } = useWordOfTheDay(sectionId);

  /**
   * Map of section occurrence ids to the corresponding list of attendances;
   * only null on first load, displays a loading spinner when null
   */
  const [occurrenceMap, setOccurrenceMap] = useState<Map<number, { date: string; attendances: Attendance[] }> | null>(
    null
  );
  /**
   * Sorted section occurrences by date
   */
  const [sortedOccurrences, setSortedOccurrences] = useState<SectionOccurrence[]>([]);

  /**
   * Currently selected date; only null on first load
   */
  const [selectedOccurrence, setSelectedOcurrence] = useState<SectionOccurrence | null>(null);

  /**
   * Staged attendances for the current date
   */
  const [stagedAttendances, setStagedAttendances] = useState<Attendance[]>([]);
  /**
   * Indicators when saving attendnace
   */
  const [showAttendanceSaveSuccess, setShowAttendanceSaveSuccess] = useState(false);
  const [showSaveSpinner, setShowSaveSpinner] = useState(false);

  /**
   * Initial word of the day fetched from the database,
   * corresponding to the current selected occurrence
   */
  const [initialWordOfTheDay, setInitialWordOfTheDay] = useState("");
  /**
   * Current word of the day, displayed in the input box
   */
  const [wordOfTheDay, setWordOfTheDay] = useState("");

  const updateStudentAttendancesMutation = useUpdateStudentAttendancesMutation(sectionId);
  const updateWordOfTheDayMutation = useUpdateWordOfTheDayMutation(sectionId);

  const [responseStatus, setResponseStatus] = useState<ResponseStatus>(ResponseStatus.NONE);
  const [responseText, setResponseText] = useState<string | null>(null);

  /**
   * Update state based on new fetched attendances
   */
  useEffect(() => {
    if (jsonAttendancesLoaded) {
      const newOccurrenceMap = new Map<number, { date: string; attendances: Attendance[] }>();
      for (const occurrence of jsonAttendances) {
        const attendances: Attendance[] = occurrence.attendances
          .map(({ id, presence, date, studentId, studentName, studentEmail, wordOfTheDayDeadline }) => ({
            id,
            presence,
            date,
            occurrenceId: occurrence.id,
            wordOfTheDayDeadline: wordOfTheDayDeadline,
            student: { id: studentId, name: studentName, email: studentEmail }
          }))
          .sort((att1, att2) => att1.student.name.toLowerCase().localeCompare(att2.student.name.toLowerCase()));
        newOccurrenceMap.set(occurrence.id, { date: occurrence.date, attendances });
      }

      const newSortedOccurrences = Array.from(newOccurrenceMap.entries())
        .sort((aOccurrence, bOccurrence) => {
          return dateSortISO(aOccurrence[1].date, bOccurrence[1].date);
        })
        .map(([occurrenceId, { date: occurrenceDate }]) => ({ id: occurrenceId, date: occurrenceDate }));

      setOccurrenceMap(newOccurrenceMap);
      setSortedOccurrences(newSortedOccurrences);

      if (selectedOccurrence === null) {
        // only update selected occurrence if it has not been set before
        setSelectedOcurrence(newSortedOccurrences[0]);
        setStagedAttendances(newOccurrenceMap.get(newSortedOccurrences[0].id)!.attendances);
      } else {
        // otherwise use existing selectedOccurrence
        setStagedAttendances(newOccurrenceMap.get(selectedOccurrence.id)!.attendances);
      }
    }
  }, [jsonAttendances]);

  /**
   * Whenever user changes tab or the fetched word of the day changes,
   * update the initial and current word of the day to display
   */
  useEffect(() => {
    if (wotdLoaded) {
      for (const wotdEntry of wotd) {
        if (wotdEntry.id === selectedOccurrence?.id) {
          setWordOfTheDay(wotdEntry.wordOfTheDay);
          setInitialWordOfTheDay(wotdEntry.wordOfTheDay);
          return;
        }
      }
    }
  }, [selectedOccurrence, wotd]);

  /**
   * Select a new tab, updating the various states
   *
   * Here, occurrenceMap will never be null, as the corresponding parent element
   * is only rendered when occurrenceMap has been defined
   */
  function handleSelectOccurrence(occurrence: SectionOccurrence) {
    setSelectedOcurrence(occurrence);
    setStagedAttendances(occurrenceMap!.get(occurrence.id)!.attendances);
    setResponseText(null);
  }

  /**
   * Change a student's attendance
   *
   * Here, occurrenceMap will never be null, as the corresponding parent elmenet
   * is only rendered when occurrenceMap has been defined
   */
  function handleAttendanceChange({ target: { name: id, value } }: React.ChangeEvent<HTMLSelectElement>): void {
    const newStagedAttendances = stagedAttendances || occurrenceMap!.get(sortedOccurrences[0].id);
    setStagedAttendances(
      newStagedAttendances?.map(attendance =>
        attendance.id == Number(id) ? { ...attendance, presence: value } : attendance
      )
    );
  }

  /**
   * Save the current staged attendances
   */
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
          setShowAttendanceSaveSuccess(true);
          setShowSaveSpinner(false);
          setTimeout(() => setShowAttendanceSaveSuccess(false), 1500);
        }
      }
    );
  }

  /**
   * Mark all students as present
   */
  function handleMarkAllPresent() {
    if (!stagedAttendances) {
      const newSelectedOccurrence = sortedOccurrences[0];
      const newStagedAttendances = occurrenceMap!.get(newSelectedOccurrence.id)!.attendances;
      setSelectedOcurrence(newSelectedOccurrence);
      setStagedAttendances(newStagedAttendances);
    }
    setStagedAttendances(stagedAttendances.map(attendance => ({ ...attendance, presence: "PR" })));
  }

  /**
   * Submit a new word of the day for a given occurrence
   */
  function handleSubmitWord() {
    if (selectedOccurrence && wordOfTheDay) {
      setResponseStatus(ResponseStatus.LOADING);
      setResponseText(null);

      // first check validity
      if (wordOfTheDay.trim().match(/\s/)) {
        setResponseStatus(ResponseStatus.NONE);
        setResponseText("Invalid word chosen (no whitespace)");
        return;
      }

      updateWordOfTheDayMutation.mutate(
        { sectionOccurrenceId: selectedOccurrence.id, wordOfTheDay },
        {
          onSuccess: () => {
            setResponseStatus(ResponseStatus.OK);
            setTimeout(() => setResponseStatus(ResponseStatus.NONE), 1500);
          },
          onError: () => {
            setResponseText("Invalid word chosen (no whitespace)");
            setResponseStatus(ResponseStatus.NONE);
          }
        }
      );
    } else {
      setResponseText("Invalid input");
    }
  }

  /**
   * Pick a new random word for the word of the day
   */
  function handlePickRandomWord() {
    setWordOfTheDay(randomWords(1)[0]);
  }

  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">Attendance</h3>
      <div className="mentor-attendance-page">
        {jsonAttendancesLoaded && occurrenceMap !== null ? (
          <React.Fragment>
            <div id="mentor-attendance">
              <div id="attendance-date-tabs-container">
                {sortedOccurrences.map(({ id, date }) => (
                  <div
                    key={id}
                    className={id === selectedOccurrence!.id ? "active" : ""}
                    onClick={() => handleSelectOccurrence({ id, date })}
                  >
                    {formatDateISO(date)}
                  </div>
                ))}
              </div>
              <table id="mentor-attendance-table">
                <tbody>
                  {selectedOccurrence &&
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
              <div id="word-of-the-day-container">
                <h4 className="word-of-the-day-title">
                  Word of the Day ({selectedOccurrence ? formatDateISO(selectedOccurrence.date) : "unselected"})
                </h4>
                {wotdLoaded ? (
                  <React.Fragment>
                    <p className="word-of-the-day-text">
                      Status:{" "}
                      {initialWordOfTheDay ? (
                        <span className="word-of-the-day-status selected">Selected</span>
                      ) : (
                        <span className="word-of-the-day-status unselected">Unselected</span>
                      )}
                    </p>
                    <div className="word-of-the-day-input-container">
                      <div>
                        <input
                          className="word-of-the-day-input"
                          type="text"
                          placeholder="Word of the Day"
                          value={wordOfTheDay}
                          onChange={e => {
                            setWordOfTheDay(e.target.value);
                          }}
                        />
                        <button className="word-of-the-day-random" onClick={handlePickRandomWord}>
                          Random
                        </button>
                      </div>
                      <div className="word-of-the-day-submit-container">
                        {responseStatus === ResponseStatus.LOADING ? (
                          <LoadingSpinner />
                        ) : responseStatus === ResponseStatus.OK ? (
                          <CheckCircle className="word-of-the-day-icon" />
                        ) : null}
                        <button
                          className="csm-btn word-of-the-day-submit"
                          onClick={handleSubmitWord}
                          disabled={!wordOfTheDay || initialWordOfTheDay == wordOfTheDay}
                        >
                          {initialWordOfTheDay ? "Update" : "Submit"}
                        </button>
                      </div>
                    </div>
                    <div className="word-of-the-day-status-bar">{responseText}</div>
                  </React.Fragment>
                ) : wotdError ? (
                  <h3>Error loading word of the day</h3>
                ) : (
                  <LoadingSpinner />
                )}
              </div>
              {!jsonAttendancesLoaded && <LoadingSpinner />}
            </div>
          </React.Fragment>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    </React.Fragment>
  );
};

export default MentorSectionAttendance;
