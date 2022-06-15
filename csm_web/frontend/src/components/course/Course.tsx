import React from "react";
import { fetchJSON } from "../../utils/api";
import { Section } from "../../utils/types";
import { SectionCard } from "./SectionCard";
import { CreateSectionModal } from "./CreateSectionModal";
import { DataExportModal } from "./DataExportModal";

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
  createSection: "mksec"
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
}

interface CourseState {
  sectionsLoaded: boolean;
  sections: {
    [day: string]: Section[];
  };
  currDayGroup: string;
  showUnavailable: boolean;
  userIsCoordinator: boolean;
  showModal: boolean;
  whichModal: string;
}

export default class Course extends React.Component<CourseProps, CourseState> {
  constructor(props: CourseProps) {
    super(props);
    this.state = {
      sections: null as any,
      sectionsLoaded: false,
      currDayGroup: "",
      showUnavailable: false,
      userIsCoordinator: false,
      showModal: false,
      whichModal: COURSE_MODAL_TYPE.createSection
    }; // Sections are grouped by day
    this.reloadSections = this.reloadSections.bind(this);
  }

  reloadSections(): void {
    interface JSONResponseType {
      sections: CourseState["sections"];
      userIsCoordinator: CourseState["userIsCoordinator"];
    }

    const { id } = this.props.match.params;
    fetchJSON(`/courses/${id}/sections`).then(({ sections, userIsCoordinator }: JSONResponseType) =>
      this.setState({ sections, userIsCoordinator, sectionsLoaded: true, currDayGroup: Object.keys(sections)[0] })
    );
  }

  componentDidMount(): void {
    this.reloadSections();
  }

  render(): React.ReactNode {
    const {
      match: {
        params: { id }
      },
      name,
      isOpen
    } = this.props;
    const {
      sectionsLoaded,
      sections,
      currDayGroup,
      showUnavailable,
      userIsCoordinator,
      showModal,
      whichModal
    } = this.state;
    let currDaySections = sections && sections[currDayGroup];
    if (currDaySections && !showUnavailable) {
      currDaySections = currDaySections.filter(({ numStudentsEnrolled, capacity }) => numStudentsEnrolled < capacity);
    }

    //This is used to distinguish between what type of modal we want
    const renderModal = () => {
      if (whichModal == COURSE_MODAL_TYPE.exportData) {
        return <DataExportModal closeModal={() => this.setState({ showModal: false })} />;
      } else {
        return (
          <CreateSectionModal
            reloadSections={this.reloadSections}
            closeModal={() => this.setState({ showModal: false })}
            courseId={Number(id)}
          />
        );
      }
    };

    // only let coordinators see the course if enrollment is not open
    if (!isOpen && sectionsLoaded && !userIsCoordinator) {
      return <h3 className="page-title center-title">Enrollment is not open.</h3>;
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
                  this.setState({ currDayGroup: dayGroup });
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
              checked={this.state.showUnavailable}
              onChange={({ target: { checked } }) => this.setState({ showUnavailable: checked })}
            />
            Show unavailable
          </label>
          {userIsCoordinator && (
            <div id="course-coord-buttons">
              <button
                className="csm-btn create-section-btn"
                onClick={() => this.setState({ showModal: true, whichModal: COURSE_MODAL_TYPE.createSection })}
              >
                <span className="inline-plus-sign">+ </span>Create Section
              </button>
              <button
                className="csm-btn export-data-btn"
                onClick={() => this.setState({ showModal: true, whichModal: COURSE_MODAL_TYPE.exportData })}
              >
                Export Data
              </button>
            </div>
          )}
        </div>
        <div id="course-section-list">
          {currDaySections && currDaySections.length > 0 ? (
            currDaySections.map(section => (
              <SectionCard key={section.id} userIsCoordinator={userIsCoordinator} {...section} />
            ))
          ) : (
            <h3 id="course-section-list-empty">No sections available, please select a different day</h3>
          )}
        </div>
        {userIsCoordinator && showModal && renderModal()}
      </div>
    );
  }
}
