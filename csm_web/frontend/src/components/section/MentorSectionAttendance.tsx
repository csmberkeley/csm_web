import { DateTime } from "luxon";
import randomWords from "random-words";
import React, { useState, useEffect } from "react";

import { DEFAULT_TIMEZONE } from "../../utils/datetime";
import {
  useSectionAttendances,
  useUpdateStudentAttendancesMutation,
  useUpdateWordOfTheDayMutation,
  useWordOfTheDay
} from "../../utils/queries/sections";
import { Attendance, AttendancePresence } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import { Tooltip } from "../Tooltip";
import { ATTENDANCE_LABELS } from "./Section";
import { CalendarMonth } from "./month_calendar/MonthCalendar";
import { dateSortISO, formatDateLocaleShort } from "./utils";

import CalendarIcon from "../../../static/frontend/img/calendar.svg";
import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import WarningIcon from "../../../static/frontend/img/triangle-exclamation-solid.svg";

import scssColors from "../../css/base/colors-export.module.scss";
import "../../css/word-of-the-day.scss";

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
   * Attendances as reflected in the last request from the database.
   * Used to compare against `stagedAttendances`.
   */
  const [savedAttendances, setSavedAttendances] = useState<Attendance[]>([]);
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

  const [calendarVisible, setCalendarVisible] = useState<boolean>(true);
  const [calendarTextMap, setCalendarTextMap] = useState<Map<string, string>>(new Map());
  const [calendarIconMap, setCalendarIconMap] = useState<Map<string, React.ReactNode>>(new Map());

  /**
   * Update state based on new fetched attendances
   */
  useEffect(() => {
    if (jsonAttendancesLoaded) {
      // the DB works in the timezone specified by DEFAULT_TIMEZONE,
      // so we must convert to the DB timezone before comparing to the current time.
      // there's no need to convert back to the local timezone here, since we only use this DateTime for comparison
      const now = DateTime.now().setZone(DEFAULT_TIMEZONE);

      const newOccurrenceMap = new Map<number, { date: string; attendances: Attendance[] }>();
      const newCalendarTextMap = new Map<string, string>();
      const newCalendarIconMap = new Map<string, React.ReactNode>();

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

        const numAttendances = attendances.length;
        const numPresent = attendances.filter(att => att.presence === AttendancePresence.PR).length;
        const numEmpty = attendances.filter(att => att.presence === AttendancePresence.EMPTY).length;
        newCalendarTextMap.set(occurrence.date, `${numPresent}/${numAttendances}`);

        const occurrenceDatetime = DateTime.fromISO(occurrence.date, { zone: DEFAULT_TIMEZONE });
        if (occurrenceDatetime < now.startOf("day") && numEmpty > 0) {
          // date is (strictly) in the past, and there are some unspecified attendances
          newCalendarIconMap.set(
            occurrence.date,
            <Tooltip
              bodyClassName="calendar-warning-icon-tooltip"
              source={<WarningIcon className="icon calendar-warning-icon" />}
              placement="top"
            >
              Attendance(s) missing!
            </Tooltip>
          );
        }
      }

      const newSortedOccurrences = Array.from(newOccurrenceMap.entries())
        .sort((aOccurrence, bOccurrence) => {
          return dateSortISO(aOccurrence[1].date, bOccurrence[1].date);
        })
        .map(([occurrenceId, { date: occurrenceDate }]) => ({ id: occurrenceId, date: occurrenceDate }));

      setOccurrenceMap(newOccurrenceMap);
      setCalendarTextMap(newCalendarTextMap);
      setSortedOccurrences(newSortedOccurrences);
      setCalendarIconMap(newCalendarIconMap);

      let newAttendances = null;
      if (selectedOccurrence === null) {
        // only update selected occurrence if it has not been set before

        const curDayEnd = now.endOf("day");

        // filter for past and future occurrences
        const pastOccurrences = newSortedOccurrences.filter(
          occurrence => DateTime.fromISO(occurrence.date, { zone: DEFAULT_TIMEZONE }) <= curDayEnd
        );
        const futureOccurrences = newSortedOccurrences.filter(
          occurrence => DateTime.fromISO(occurrence.date, { zone: DEFAULT_TIMEZONE }) > curDayEnd
        );
        let newSelectedOccurrence = null;
        if (pastOccurrences.length > 0) {
          // set to the most recent past occurrence
          newSelectedOccurrence = pastOccurrences[0];
        } else if (futureOccurrences.length > 0) {
          // no past occurrences, so set to the most recent future occurrence
          newSelectedOccurrence = futureOccurrences[futureOccurrences.length - 1];
        }
        setSelectedOcurrence(newSelectedOccurrence);
        if (newSelectedOccurrence !== null) {
          // if we chose a new selected occurrence, update the staged attendances as well
          newAttendances = newOccurrenceMap.get(newSelectedOccurrence?.id)?.attendances;
        }
      } else {
        // otherwise use existing selectedOccurrence
        newAttendances = newOccurrenceMap.get(selectedOccurrence.id)!.attendances;
      }
      if (newAttendances) {
        setStagedAttendances(newAttendances);
        setSavedAttendances(newAttendances);
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
   * Whenever the user changes tab, make sure it is in view.
   */
  useEffect(() => {
    if (selectedOccurrence != null) {
      const tab = document.getElementById(`date-tab-${selectedOccurrence.id}`);
      if (tab != null) {
        tab.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedOccurrence]);

  /**
   * Select a new tab, updating the various states
   *
   * Here, occurrenceMap will never be null, as the corresponding parent element
   * is only rendered when occurrenceMap has been defined
   */
  function handleSelectOccurrence(occurrence: SectionOccurrence) {
    setSelectedOcurrence(occurrence);
    setStagedAttendances(occurrenceMap!.get(occurrence.id)!.attendances);
    setSavedAttendances(occurrenceMap!.get(occurrence.id)!.attendances);
    setResponseText(null);
  }

  function handleToggleCalendar() {
    setCalendarVisible(visible => !visible);
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
        attendance.id == Number(id) ? { ...attendance, presence: value as AttendancePresence } : attendance
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
    setStagedAttendances(stagedAttendances.map(attendance => ({ ...attendance, presence: AttendancePresence.PR })));
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

  // determine whether attendances have changed from what is saved
  const attendancesHaveChanged = stagedAttendances.reduce(
    (hasChanged, attendance, index) =>
      // either has changed already, or lengths don't match (shouldn't happen), or presences have changed
      hasChanged || index >= savedAttendances.length || attendance.presence !== savedAttendances[index].presence,
    // initial value is false
    false
  );

  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">Attendance</h3>
      <div className="mentor-attendance-page">
        {jsonAttendancesLoaded && occurrenceMap !== null ? (
          <React.Fragment>
            <div id="mentor-attendance">
              <div id="attendance-side-bar">
                <div
                  id="attendance-calendar-toggle"
                  className={calendarVisible ? "active" : ""}
                  onClick={handleToggleCalendar}
                >
                  <CalendarIcon className="icon" />
                </div>
                <div id="attendance-date-tabs-container">
                  {sortedOccurrences.map(({ id, date }) => (
                    <div
                      key={id}
                      id={`date-tab-${id}`}
                      className={id === selectedOccurrence?.id ? "active" : ""}
                      onClick={() => handleSelectOccurrence({ id, date })}
                    >
                      {formatDateLocaleShort(date)}
                    </div>
                  ))}
                </div>
              </div>
              <div id="mentor-attendance-content">
                <table className="csm-table" id="mentor-attendance-table">
                  <tbody>
                    {selectedOccurrence &&
                      stagedAttendances.map(({ id, student, presence }) => {
                        const cssSuffix = ATTENDANCE_LABELS[presence][1].toLowerCase();
                        const attendanceColor = scssColors[`attendance-${cssSuffix}`];
                        const attendanceFgColor = scssColors[`attendance-${cssSuffix}-fg`];
                        return (
                          <tr key={id} className="csm-table-row">
                            <td className="csm-table-item">{student.name}</td>
                            <td className="csm-table-item">
                              <select
                                value={presence}
                                name={String(id)}
                                className="form-select mentor-attendance-input"
                                style={{ backgroundColor: attendanceColor, color: attendanceFgColor }}
                                onChange={handleAttendanceChange}
                              >
                                {Object.entries(ATTENDANCE_LABELS).map(([value, [label]]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                <div id="mentor-attendance-controls">
                  {showSaveSpinner && <LoadingSpinner />}
                  {showAttendanceSaveSuccess && <CheckCircle height="2em" width="2em" />}
                  <button className="primary-link-btn" onClick={handleMarkAllPresent}>
                    Mark All As Present
                  </button>
                  <button className="primary-btn" onClick={handleSaveAttendance} disabled={!attendancesHaveChanged}>
                    Save
                  </button>
                </div>
                <div id="word-of-the-day-container">
                  <h4 className="word-of-the-day-title">
                    Word of the Day (
                    {selectedOccurrence ? formatDateLocaleShort(selectedOccurrence.date) : "unselected"})
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
                      <div className="word-of-the-day-action-container">
                        <div className="word-of-the-day-input-container">
                          <input
                            className="form-input"
                            name="word-of-the-day"
                            type="text"
                            placeholder="Word of the Day"
                            value={wordOfTheDay}
                            onChange={e => {
                              setWordOfTheDay(e.target.value);
                            }}
                          />
                          <button className="primary-link-btn" onClick={handlePickRandomWord}>
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
                            className="primary-btn"
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
            </div>
            {calendarVisible && (
              <div id="mentor-attendance-calendar">
                <CalendarMonth
                  occurrenceDates={sortedOccurrences.map(occurrence => occurrence.date)}
                  occurrenceTextMap={calendarTextMap}
                  occurrenceIconMap={calendarIconMap}
                  selectedOccurrence={selectedOccurrence?.date}
                  onClickDate={date => {
                    // find the section occurrence with the given date
                    const clickedOccurrence = sortedOccurrences.find(occurrence => occurrence.date === date);
                    if (clickedOccurrence) {
                      handleSelectOccurrence(clickedOccurrence);
                    }
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ) : (
          <LoadingSpinner />
        )}
      </div>
    </React.Fragment>
  );
};

export default MentorSectionAttendance;
