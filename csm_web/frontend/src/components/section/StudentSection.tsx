import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";

import { DEFAULT_TIMEZONE } from "../../utils/datetime";
import {
  useDropUserMutation,
  useStudentAttendances,
  useStudentSubmitWordOfTheDayMutation
} from "../../utils/queries/sections";
import { Mentor, Override, Role, Spacetime } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { ATTENDANCE_LABELS, InfoCard, SectionDetail, SectionSpacetime } from "./Section";
import { dateSortISO, formatDateLocaleShort, formatDateAbbrevWord } from "./utils";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import XIcon from "../../../static/frontend/img/x.svg";

import scssColors from "../../css/base/colors-export.module.scss";
import "../../css/word-of-the-day.scss";

interface StudentSectionType {
  id: number;
  course: string;
  courseTitle: string;
  mentor: Mentor;
  spacetimes: Spacetime[];
  override?: Override;
  associatedProfileId: number;
}

export default function StudentSection({
  id,
  course,
  courseTitle,
  mentor,
  spacetimes,
  override,
  associatedProfileId
}: StudentSectionType) {
  return (
    <SectionDetail
      course={course}
      courseTitle={courseTitle}
      userRole={Role.STUDENT}
      links={[
        ["Section", ""],
        ["Attendance", "attendance"]
      ]}
    >
      <Routes>
        <Route
          path="attendance"
          element={<StudentSectionAttendance associatedProfileId={associatedProfileId} id={id} />}
        />
        <Route
          index
          element={
            <StudentSectionInfo
              mentor={mentor}
              spacetimes={spacetimes}
              override={override}
              associatedProfileId={associatedProfileId}
            />
          }
        />
      </Routes>
    </SectionDetail>
  );
}

interface StudentSectionInfoProps {
  mentor: Mentor;
  spacetimes: Spacetime[];
  override?: Override;
  associatedProfileId: number;
}

// eslint-disable-next-line no-unused-vars
function StudentSectionInfo({ mentor, spacetimes, associatedProfileId }: StudentSectionInfoProps) {
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">My Section</h3>
      <div className="section-info-cards-container">
        {mentor && (
          <InfoCard title="Mentor">
            <h5>
              <Link className="hyperlink" to={`/profile/${mentor.user.id}`}>
                {mentor.name}
              </Link>
            </h5>
            <a href={`mailto:${mentor.email}`}>{mentor.email}</a>
          </InfoCard>
        )}
        {spacetimes.map(({ override, ...spacetime }, index) => (
          <SectionSpacetime
            manySpacetimes={spacetimes.length > 1}
            index={index}
            key={spacetime.id}
            spacetime={spacetime}
            override={override}
          />
        ))}
        <DropSection profileId={associatedProfileId} />
      </div>
    </React.Fragment>
  );
}

interface DropSectionProps {
  profileId: number;
}

enum DropSectionStage {
  INITIAL = "INITIAL",
  CONFIRM = "CONFIRM",
  DROPPED = "DROPPED"
}

function DropSection({ profileId }: DropSectionProps) {
  const studentDropMutation = useDropUserMutation(profileId);
  const [stage, setStage] = useState<DropSectionStage>(DropSectionStage.INITIAL);

  const performDrop = () => {
    studentDropMutation.mutate(undefined, {
      onSuccess: () => {
        setStage(DropSectionStage.DROPPED);
      }
    });
  };

  switch (stage) {
    case DropSectionStage.INITIAL:
      return (
        <InfoCard title="Drop Section" showTitle={false}>
          <h5>Drop Section</h5>
          <button className="danger-btn" onClick={() => setStage(DropSectionStage.CONFIRM)}>
            <XIcon className="icon" />
            Drop
          </button>
        </InfoCard>
      );
    case DropSectionStage.CONFIRM:
      return (
        <Modal closeModal={() => setStage(DropSectionStage.INITIAL)}>
          <div className="drop-confirmation">
            <h5>Are you sure you want to drop?</h5>
            <p>You are not guaranteed an available spot in another section!</p>
            <button className="danger-btn" onClick={performDrop}>
              Confirm
            </button>
          </div>
        </Modal>
      );
    case DropSectionStage.DROPPED:
      return <Navigate to="/" />;
  }
}

interface StudentSectionAttendanceProps {
  associatedProfileId: number;
  id: number;
}

enum ResponseStatus {
  NONE,
  LOADING,
  OK
}

function StudentSectionAttendance({ associatedProfileId, id }: StudentSectionAttendanceProps) {
  const {
    data: attendances,
    isSuccess: attendancesLoaded,
    isError: attendancesLoadError,
    refetch: refetchAttendances
  } = useStudentAttendances(associatedProfileId);

  const [selectedAttendanceId, setSelectedAttendanceId] = useState<number>(-1);
  const [currentWord, setCurrentWord] = useState<string>("");
  /* API response text to display */
  const [responseText, setResponseText] = useState<string | null>(null);
  /* API response status; whether it's loading, etc. */
  const [responseStatus, setResponseStatus] = useState<ResponseStatus>(ResponseStatus.NONE);

  const submitWordOfTheDayMutation = useStudentSubmitWordOfTheDayMutation(id);

  useEffect(() => {
    if (attendancesLoaded) {
      const firstAttendance = [...attendances]
        // only allow choosing from dates with blank attendances
        .filter(attendance => attendance.presence === "")
        // sort and get the first attendance
        .sort((a, b) => dateSortISO(a.date, b.date))[0];
      setSelectedAttendanceId(firstAttendance?.id ?? -1);
    }
  }, [attendancesLoaded]);

  function handleSelectedAttendanceIdChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newAttendanceId = parseInt(e.target.value);
    setSelectedAttendanceId(newAttendanceId);
  }

  function handleSubmitWord() {
    if (!currentWord.trim() || selectedAttendanceId === -1) {
      setResponseText("Invalid input");
      return; // don't submit if no word
    }

    // check for whether the attendance is already taken
    const attendance = attendances?.find(att => att.id === selectedAttendanceId);
    if (attendance !== undefined && attendance.presence !== "") {
      setResponseText("Attendance already taken");
      return;
    }

    setResponseStatus(ResponseStatus.LOADING);
    setResponseText(null);
    submitWordOfTheDayMutation.mutate(
      { attendanceId: selectedAttendanceId, wordOfTheDay: currentWord },
      {
        onSuccess: () => {
          setResponseText(null);
          setResponseStatus(ResponseStatus.OK);
          setTimeout(() => {
            setResponseStatus(ResponseStatus.NONE);
            setCurrentWord("");
          }, 1500);
          refetchAttendances();
        },
        onError: response => {
          setResponseText(response.detail);
          setResponseStatus(ResponseStatus.NONE);
        }
      }
    );
  }

  // get deadline for word of the day submission
  let wordOfTheDayDeadline = null;
  let wordOfTheDayDeadlinePassed = false;
  if (selectedAttendanceId !== -1) {
    const matchingAttendance = attendances?.find(attendance => attendance.id === selectedAttendanceId);
    wordOfTheDayDeadline = matchingAttendance?.wordOfTheDayDeadline ?? null;

    // only compare current date if deadline exists
    if (wordOfTheDayDeadline !== null) {
      // convert from ISO yyyy-mm-dd (stored in the database as `America/Los_Angeles`)
      const parsedDeadline = DateTime.fromISO(wordOfTheDayDeadline, { zone: DEFAULT_TIMEZONE });
      // get the current local time
      const now = DateTime.now();
      // compare the two dates
      wordOfTheDayDeadlinePassed = now > parsedDeadline;
    }
  }

  return attendancesLoaded ? (
    <React.Fragment>
      <div id="word-of-the-day-card">
        <h3 className="word-of-the-day-title">Submit Word of the Day</h3>
        <div className="word-of-the-day-action-container">
          <div className="word-of-the-day-input-container">
            <select
              value={selectedAttendanceId}
              className="form-select"
              name="word-of-the-day-date"
              onChange={handleSelectedAttendanceIdChange}
            >
              {attendances
                // only allow choosing from dates with blank attendances
                .filter(attendance => attendance.presence === "")
                // sort by date (most recent first)
                .sort((a, b) => dateSortISO(a.date, b.date))
                // convert to option elements
                .map((occurrence, idx) => (
                  <option key={idx} value={occurrence.id}>
                    {formatDateLocaleShort(occurrence.date)}
                  </option>
                ))}
            </select>
            <input
              className="form-input"
              name="word-of-the-day"
              type="text"
              placeholder="Word of the Day"
              value={currentWord}
              onChange={e => setCurrentWord(e.target.value)}
            />
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
              disabled={
                !currentWord ||
                selectedAttendanceId === -1 ||
                responseStatus === ResponseStatus.LOADING ||
                wordOfTheDayDeadlinePassed
              }
            >
              Submit
            </button>
          </div>
        </div>
        <div className="word-of-the-day-status-bar">
          <div className="word-of-the-day-deadline-container">
            {wordOfTheDayDeadline && (
              <React.Fragment>
                Deadline:{" "}
                <span className={`word-of-the-day-deadline ${wordOfTheDayDeadlinePassed ? "passed" : ""}`}>
                  {formatDateAbbrevWord(wordOfTheDayDeadline)}
                </span>
              </React.Fragment>
            )}
          </div>
          <div className="word-of-the-day-status-text">{responseText}</div>
        </div>
      </div>
      <table id="attendance-table" className="csm-table standalone">
        <thead className="csm-table-head">
          <tr className="csm-table-head-row">
            <th className="csm-table-item">Date</th>
            <th className="csm-table-item">Status</th>
          </tr>
        </thead>
        <tbody>
          {attendances
            // sort by date (most recent first)
            .sort((a, b) => dateSortISO(a.date, b.date))
            // convert to a table row
            .map(({ presence, date }) => {
              const [label, cssSuffix] = ATTENDANCE_LABELS[presence];
              const attendanceColor = scssColors[`attendance-${cssSuffix}`];
              const attendanceFgColor = scssColors[`attendance-${cssSuffix}-fg`];
              return (
                <tr key={date} className="csm-table-row">
                  <td className="csm-table-item">{formatDateLocaleShort(date)}</td>
                  <td className="csm-table-item">
                    <div
                      className="attendance-status"
                      style={{ backgroundColor: attendanceColor, color: attendanceFgColor }}
                    >
                      {label}
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </React.Fragment>
  ) : attendancesLoadError ? (
    <h3>Attendances could not be loaded</h3>
  ) : (
    <LoadingSpinner className="spinner-centered" />
  );
}
