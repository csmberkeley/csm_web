import React, { useState } from "react";
import { DayGroup } from "../../utils/queries/courses";
import { Course as CourseType } from "../../utils/types";
import { DAY_OF_WEEK_ABREVIATIONS } from "./Course";
import { CreateSectionModal } from "./CreateSectionModal";
import { SectionCard } from "./SectionCard";
import { SettingsModal } from "./SettingsModal";
import { WhitelistModal } from "./WhitelistModal";

import PencilIcon from "../../../static/frontend/img/pencil.svg";
import PlusIcon from "../../../static/frontend/img/plus.svg";

const COURSE_MODAL_TYPE = Object.freeze({
  createSection: "mksec",
  whitelist: "whitelist",
  settings: "settings"
});

interface CourseSectionProps {
  course: CourseType;
  sectionsByDay: DayGroup[];
  enrollmentTimeString: string;
  hasPriorityEnrollment: boolean;
  userIsCoordinator: boolean;
  reloadSections: () => void;
}

const CourseSections = ({
  course,
  sectionsByDay,
  enrollmentTimeString,
  hasPriorityEnrollment,
  userIsCoordinator,
  reloadSections
}: CourseSectionProps): React.ReactElement | null => {
  /**
   * The current selected day of the week.
   */
  const [currDayGroupIndex, setCurrDayGroupIndex] = useState<number>(0);
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
          courseId={course.id}
        />
      );
    } else if (whichModal == COURSE_MODAL_TYPE.whitelist) {
      return <WhitelistModal course={course} closeModal={() => setShowModal(false)} />;
    } else if (whichModal == COURSE_MODAL_TYPE.settings) {
      return <SettingsModal courseId={course.id} closeModal={() => setShowModal(false)} />;
    }
    return null;
  };

  let currDaySections = sectionsByDay?.[currDayGroupIndex]?.sections ?? null;
  if (currDaySections && !showUnavailable) {
    currDaySections = currDaySections.filter(({ numStudentsEnrolled, capacity }) => numStudentsEnrolled < capacity);
  }

  return (
    <>
      <div id="course-section-controls">
        <div id="day-selector">
          {sectionsByDay.map((dayGroup, index) => (
            <button
              className={`day-btn ${index == currDayGroupIndex ? "active" : ""}`}
              key={index}
              onClick={() => {
                setCurrDayGroupIndex(index);
              }}
            >
              {dayGroup.days.map(day => DAY_OF_WEEK_ABREVIATIONS[day]).join("/")}
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
            {hasPriorityEnrollment
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
    </>
  );
};
export default CourseSections;
