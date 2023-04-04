import React, { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import {
  useDropUserMutation,
  useStudentAttendances,
  useStudentSubmitWordOfTheDayMutation
} from "../../utils/queries/sections";
import { Mentor, Override, Spacetime } from "../../utils/types";
import Modal from "../Modal";
import { ATTENDANCE_LABELS, InfoCard, ROLES, SectionDetail, SectionSpacetime } from "./Section";
import { dateSortWord, formatDateISOToWord } from "./utils";

import XIcon from "../../../static/frontend/img/x.svg";
import LoadingSpinner from "../LoadingSpinner";
import CheckCircle from "../../../static/frontend/img/check_circle.svg";

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
      userRole={ROLES.STUDENT}
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
function StudentSectionInfo({ mentor, spacetimes, override, associatedProfileId }: StudentSectionInfoProps) {
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">My Section</h3>
      <div className="section-info-cards-container">
        {mentor && (
          <InfoCard title="Mentor">
            <h5>{mentor.name}</h5>
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
      </div>
      <div className="registration-container">
        <p title="Waitlist Position">
          <WaitlistPosition profileId={associatedProfileId} />
        </p>
        <p title="Drop Section">
          <DropSection profileId={associatedProfileId} />
        </p>
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
            <XIcon height="1.3em" width="1.3em" />
            Drop
          </button>
        </InfoCard>
      );
    case DropSectionStage.CONFIRM:
      return (
        <Modal className="drop-confirmation" closeModal={() => setStage(DropSectionStage.INITIAL)}>
          <h5>Are you sure you want to drop?</h5>
          <p>You are not guaranteed an available spot in another section!</p>
          <button className="danger-btn" onClick={performDrop}>
            Confirm
          </button>
        </Modal>
      );
    case DropSectionStage.DROPPED:
      return <Navigate to="/" />;
  }
}

interface WaitlistPositionProps {
  profileId: number;
}
interface WaitlistPositionState {
  stage: string;
}

class WaitlistPosition extends React.Component<WaitlistPositionProps, WaitlistPositionState> {
  static STAGES = Object.freeze({ INITIAL: "INITIAL", CONFIRM: "CONFIRM", DROPPED: "DROPPED" });

  constructor(props: DropSectionProps) {
    super(props);
    this.state = { stage: WaitlistPosition.STAGES.INITIAL };
    this.performDrop = this.performDrop.bind(this);
  }

  performDrop() {
    //TODO: Handle API failure
    fetchWithMethod(`students/${this.props.profileId}/drop`, HTTP_METHODS.PATCH).then(() =>
      this.setState({ stage: WaitlistPosition.STAGES.DROPPED })
    );
  }

  render() {
    switch (this.state.stage) {
      case WaitlistPosition.STAGES.INITIAL:
        return (
          <InfoCard title="Drop Section" showTitle={false}>
            <h5>Waitlist Position</h5>
            <button className="warning-btn" onClick={() => this.setState({ stage: DropSection.STAGES.CONFIRM })}>
              <XIcon height="1.3em" width="1.3em" />
              Drop
            </button>
          </InfoCard>
        );
      case WaitlistPosition.STAGES.CONFIRM:
        return (
          <Modal className="drop-confirmation" closeModal={() => this.setState({ stage: DropSection.STAGES.INITIAL })}>
            <h5>Are you sure you want to drop your position in the waitlist?</h5>
            <p>You are not guaranteed an available spot in another section!</p>
            <button className="-btn" onClick={this.performDrop}>
              Confirm
            </button>
          </Modal>
        );
    }
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
        .sort((a, b) => dateSortWord(a.date, b.date))[0];
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
      /*
       * TODO: replace all of this with a datetime library with better timezone support.
       *
       * There's a few things to consider here when comparing these dates.
       * Firstly, the date stored in the database and all comparisons done in Django
       * are in the `America/Los_Angeles` timezone, whereas JS Date objects internally use UTC,
       * and without a timezone specification, it uses the local timezone of the host.
       * This inconsistency means that it's hard to make the frontend exactly match
       * the actual comparison done by Django in the backend.
       * A compromise is to make the frontend a little bit less strict,
       * allowing for submissions that match the *local* date, which would then possibly
       * get rejected by the backend when it parses the request.
       * The only times where the frontend would incorrectly reject inputs would be
       * if anybody was west of the `America/Los_Angeles` timezone, which should be quite rare.
       *
       * In implementation, we first convert the deadline from the database as if it was in UTC,
       * and fetch the current time via native JS Date objects.
       * We then format this date in the local timezone, and trick JS into thinking
       * that the displayed date is actually in UTC, and parse it again.
       * Now that the date objects are stored in the same relative offset
       * (both in UTC, even though they originated from different timezones),
       * we can do a simple comparison without worrying about what the values actually are
       * (the stored values would not actually be correct in any way,
       * but would match relative to each other).
       */

      // convert from ISO yyyy-mm-dd using UTC (stored in the database as `America/Los_Angeles`)
      const parsedDeadline = new Date(wordOfTheDayDeadline + "T00:00:00.000Z");
      // get the current time (stored internally as UTC)
      const now = new Date();
      // convert to mm/dd/yyyy form, in the local timezone
      const nowString = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      // extract each part as string
      const [month, day, year] = nowString.split("/");
      // put them back in ISO format as if it was UTC
      const parsedNowString = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
      // both are stored in UTC, even though they originated from different timezones,
      // so we can now compare the two
      wordOfTheDayDeadlinePassed = parsedNowString > parsedDeadline;
    }
  }

  return attendancesLoaded ? (
    <React.Fragment>
      <div id="word-of-the-day-card">
        <h3 className="word-of-the-day-title">Submit Word of the Day</h3>
        <div className="word-of-the-day-input-container">
          <div className="word-of-the-day-select-container">
            <select
              value={selectedAttendanceId}
              className="word-of-the-day-select"
              onChange={handleSelectedAttendanceIdChange}
            >
              {attendances
                // only allow choosing from dates with blank attendances
                .filter(attendance => attendance.presence === "")
                // sort by date (most recent first)
                .sort((a, b) => dateSortWord(a.date, b.date))
                // convert to option elements
                .map((occurrence, idx) => (
                  <option key={idx} value={occurrence.id}>
                    {occurrence.date}
                  </option>
                ))}
            </select>
            <input
              className="word-of-the-day-input"
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
              className="csm-btn word-of-the-day-submit"
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
                  {formatDateISOToWord(wordOfTheDayDeadline)}
                </span>
              </React.Fragment>
            )}
          </div>
          <div className="word-of-the-day-status-text">{responseText}</div>
        </div>
      </div>
      <table id="attendance-table" className="standalone-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {attendances
            // sort by date (most recent first)
            .sort((a, b) => dateSortWord(a.date, b.date))
            // convert to a table row
            .map(({ presence, date }) => {
              const [label, cssSuffix] = ATTENDANCE_LABELS[presence];
              return (
                <tr key={date}>
                  <td>{date}</td>
                  <td className="status">
                    <div style={{ backgroundColor: `var(--csm-attendance-${cssSuffix})` }}>{label}</div>
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
