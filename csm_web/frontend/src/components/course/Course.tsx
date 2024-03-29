import { DateTime } from "luxon";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { DEFAULT_LONG_LOCALE_OPTIONS } from "../../utils/datetime";
import { useCourseSections } from "../../utils/queries/courses";
import { Course as CourseType } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import { CreateSectionModal } from "./CreateSectionModal";
import { SectionCard } from "./SectionCard";
import { SettingsModal } from "./SettingsModal";
import { WhitelistModal } from "./WhitelistModal";

import PencilIcon from "../../../static/frontend/img/pencil.svg";
import PlusIcon from "../../../static/frontend/img/plus.svg";

import "../../css/course.scss";

const DAY_OF_WEEK_ABREVIATIONS: { [day: string]: string } = Object.freeze({
  Monday: "M",
  Tuesday: "Tu",
  Wednesday: "W",
  Thursday: "Th",
  Friday: "F",
  Saturday: "Sa",
  Sunday: "Su"
});

const COURSE_MODAL_TYPE = Object.freeze({
  createSection: "mksec",
  whitelist: "whitelist",
  settings: "settings"
});

interface CourseProps {
  /*
   * `courses` will be null if it hasn't yet been loaded (the relevant request to the API is performed in CourseMenu)
   * We structure things like this in order to avoid a 'waterfall' where we don't start fetching sections until
   * CourseMenu is done with its API requests, making the user suffer twice the latency for no reason.
   */
  courses: Map<number, CourseType> | null;
  enrollmentTimes: Array<{ courseName: string; enrollmentDate: DateTime }>;
  priorityEnrollment: DateTime | undefined;
}

const Course = ({ courses, priorityEnrollment, enrollmentTimes }: CourseProps): React.ReactElement | null => {
  /**
   * Course id from the URL.
   */
  const { courseId } = useParams();

  /**
   * Sections grouped by day of the week, and whether the user is a corodinator.
   */
  const {
    data: jsonSections,
    isSuccess: sectionsLoaded,
    isError: sectionsLoadError,
    refetch: reloadSections
  } = useCourseSections(courseId ? parseInt(courseId) : undefined, response => {
    setCurrDayGroup(Object.keys(response.sections)[0]);
  });

  /**
   * The current selected day of the week.
   */
  const [currDayGroup, setCurrDayGroup] = useState<string>(sectionsLoaded ? Object.keys(jsonSections.sections)[0] : "");
  /**
   * Whether to show unavailable (full) sections.
   */
  const [showUnavailable, setShowUnavailable] = useState<boolean>(false);
  /**
   * Whether to show the modal.
   */
  const [showModal, setShowModal] = useState<boolean>(false);
  /**
   * The type of modal to show.
   */
  const [whichModal, setWhichModal] = useState<string>(COURSE_MODAL_TYPE.createSection);

  /**
   * Render the currently chosen modal.
   */
  const renderModal = (): React.ReactElement | null => {
    if (whichModal == COURSE_MODAL_TYPE.createSection) {
      return (
        <CreateSectionModal
          reloadSections={reloadSections}
          closeModal={() => setShowModal(false)}
          courseId={Number(courseId)}
        />
      );
    } else if (whichModal == COURSE_MODAL_TYPE.whitelist) {
      return <WhitelistModal course={course} closeModal={() => setShowModal(false)} />;
    } else if (whichModal == COURSE_MODAL_TYPE.settings) {
      return <SettingsModal courseId={Number(courseId)} closeModal={() => setShowModal(false)} />;
    }
    return null;
  };

  if (courses === null) {
    // if courses not loaded, parent component deals with loading spinner
    return null;
  } else if (!courses.has(parseInt(courseId!)) || sectionsLoadError) {
    return <h3>Course not found</h3>;
  } else if (!sectionsLoaded) {
    return <LoadingSpinner className="spinner-centered" />;
  }

  const { sections, userIsCoordinator } = jsonSections;

  /**
   * Course object from the courses map, retrieved from the course id.
   * Checked prior, so this should always exist.
   */
  const course = courses.get(parseInt(courseId!))!;

  let currDaySections = sections && sections[currDayGroup];
  if (currDaySections && !showUnavailable) {
    currDaySections = currDaySections.filter(({ numStudentsEnrolled, capacity }) => numStudentsEnrolled < capacity);
  }

  const enrollmentDate =
    priorityEnrollment ?? enrollmentTimes.find(({ courseName }) => courseName == course.name)?.enrollmentDate;
  const enrollmentTimeString = enrollmentDate?.toLocaleString(DEFAULT_LONG_LOCALE_OPTIONS) ?? "";

  return (
    <div id="course-section-selector">
      <div id="course-section-controls">
        <h2 className="course-title">{course.name}</h2>
        <div id="day-selector">
          {Object.keys(sections).map(dayGroup => (
            <button
              className={`day-btn ${dayGroup == currDayGroup ? "active" : ""}`}
              key={dayGroup}
              onClick={() => {
                setCurrDayGroup(dayGroup);
              }}
            >
              {dayGroup
                .slice(1, -1)
                .split(",")
                .map(day => DAY_OF_WEEK_ABREVIATIONS[day])
                .join("/")}
            </button>
          ))}
        </div>
        <label id="show-unavailable-toggle">
          <input
            type="checkbox"
            checked={showUnavailable}
            onChange={({ target: { checked } }) => setShowUnavailable(checked)}
          />
          Show unavailable
        </label>
        {userIsCoordinator && (
          <div id="course-coord-buttons">
            <button
              className="primary-btn"
              onClick={() => {
                setShowModal(true);
                setWhichModal(COURSE_MODAL_TYPE.createSection);
              }}
            >
              <PlusIcon className="icon" />
              Create Section
            </button>
            <button
              className="primary-btn"
              onClick={() => {
                setShowModal(true);
                setWhichModal(COURSE_MODAL_TYPE.settings);
              }}
            >
              Settings
            </button>
            {course.isRestricted && (
              <button
                className="primary-btn"
                onClick={() => {
                  setShowModal(true);
                  setWhichModal(COURSE_MODAL_TYPE.whitelist);
                }}
              >
                <PencilIcon className="icon" id="edit-whitelist-icon" />
                Edit whitelist
              </button>
            )}
          </div>
        )}
        {!course.enrollmentOpen && (
          <div id="course-enrollment-open-status">
            {priorityEnrollment
              ? `Priority enrollment opens ${enrollmentTimeString}.`
              : `Enrollment opens ${enrollmentTimeString}.`}
          </div>
        )}
      </div>
      <div id="course-section-list">
        {currDaySections && currDaySections.length > 0 ? (
          currDaySections.map(section => (
            <SectionCard
              key={section.id}
              userIsCoordinator={userIsCoordinator}
              courseOpen={course.enrollmentOpen}
              {...section}
            />
          ))
        ) : (
          <h3 id="course-section-list-empty">No sections available, please select a different day</h3>
        )}
      </div>
      {userIsCoordinator && showModal && renderModal()}
    </div>
  );
};
export default Course;
