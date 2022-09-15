import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../utils/api";
import { Section } from "../../utils/types";
import { SectionCard } from "./SectionCard";
import { CreateSectionModal } from "./CreateSectionModal";
import { DataExportModal } from "./DataExportModal";
import { ManageLabelsModal } from "./ManageLabelsModal";

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
  exportData: "csv",
  createSection: "mksec",
  manageLabels: "labels"
});

interface CourseProps {
  match: {
    params: {
      id: string;
    };
  };
  /*
   * Name will be false if it hasn't yet been loaded (the relevant request to the API is performed in CourseMenu)
   * We structure things like this in order to avoid a 'waterfall' where we don't start fetching sections until
   * CourseMenu is done with its API requests, making the user suffer twice the latency for no reason.
   */
  name: boolean | string;
  isOpen: boolean;
  isPriority: boolean;
  enrollmentTimeString: string;
}

const Course = ({
  match: {
    params: { id }
  },
  name,
  isOpen,
  isPriority,
  enrollmentTimeString
}: CourseProps): React.ReactElement | null => {
  /**
   * Sections grouped by day of the week.
   */
  const [sections, setSections] = useState<{ [day: string]: Section[] }>(null as never);
  /**
   * Whether the sections have finished loading.
   */
  const [sectionsLoaded, setSectionsLoaded] = useState<boolean>(false);
  /**
   * The current selected day of the week.
   */
  const [currDayGroup, setCurrDayGroup] = useState<string>("");
  /**
   * Whether to show unavailable (full) sections.
   */
  const [showUnavailable, setShowUnavailable] = useState<boolean>(false);
  /**
   * Whether the user is a coordinator.
   */
  const [userIsCoordinator, setUserIsCoordinator] = useState<boolean>(false);
  /**
   * Whether to show the modal.
   */
  const [showModal, setShowModal] = useState<boolean>(false);
  /**
   * The type of modal to show.
   */
  const [whichModal, setWhichModal] = useState<string>(COURSE_MODAL_TYPE.createSection);

  /**
   * Fetch all sections for the course and update state accordingly.
   */
  const reloadSections = (): void => {
    interface JSONResponseType {
      sections: { [day: string]: Section[] };
      userIsCoordinator: boolean;
    }

    fetchJSON(`/courses/${id}/sections`).then(({ sections, userIsCoordinator }: JSONResponseType) => {
      setSections(sections);
      setUserIsCoordinator(userIsCoordinator);
      setCurrDayGroup(Object.keys(sections)[0]);
      setSectionsLoaded(true);
    });
  };

  // reload sections upon first mount
  useEffect(() => {
    reloadSections();
  }, []);

  /**
   * Render the currently chosen modal.
   */
  const renderModal = (): React.ReactElement => {
    if (whichModal == COURSE_MODAL_TYPE.exportData) {
      return <DataExportModal closeModal={() => setShowModal(false)} />;
    } else if (whichModal == COURSE_MODAL_TYPE.manageLabels) {
      return (
        <ManageLabelsModal
          closeModal={() => setShowModal(false)}
          courseId={Number(id)}
          reloadSections={reloadSections}
          title={name}
        />
      );
    } else {
      return (
        <CreateSectionModal
          reloadSections={reloadSections}
          closeModal={() => setShowModal(false)}
          courseId={Number(id)}
        />
      );
    }
  };

  let currDaySections = sections && sections[currDayGroup];
  if (currDaySections && !showUnavailable) {
    currDaySections = currDaySections.filter(({ numStudentsEnrolled, capacity }) => numStudentsEnrolled < capacity);
  }

  return !(name && sectionsLoaded) ? null : (
    <div id="course-section-selector">
      <div id="course-section-controls">
        <h2 className="course-title">{name}</h2>
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
              className="csm-btn create-section-btn"
              onClick={() => {
                setShowModal(true);
                setWhichModal(COURSE_MODAL_TYPE.createSection);
              }}
            >
              <span className="inline-plus-sign">+ </span>Create Section
            </button>
            <button
              className="csm-btn export-data-btn"
              onClick={() => {
                setShowModal(true);
                setWhichModal(COURSE_MODAL_TYPE.exportData);
              }}
            >
              Export Data
            </button>
            <button
              className="csm-btn export-data-btn"
              onClick={() => {
                setShowModal(true);
                setWhichModal(COURSE_MODAL_TYPE.manageLabels);
              }}
            >
              Manage Labels
            </button>
          </div>
        )}
        {!isOpen && (
          <div id="course-enrollment-open-status">
            {isPriority
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
              labels={section.labelSet}
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
