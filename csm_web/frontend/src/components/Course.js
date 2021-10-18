import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS, normalizeEndpoint } from "../utils/api";
import { Redirect, Link } from "react-router-dom";
import LocationIcon from "../../static/frontend/img/location.svg";
import LoadingSpinner from "./LoadingSpinner";
import UserIcon from "../../static/frontend/img/user.svg";
import GroupIcon from "../../static/frontend/img/group.svg";
import ClockIcon from "../../static/frontend/img/clock.svg";
import CheckCircle from "../../static/frontend/img/check_circle.svg";
import XCircle from "../../static/frontend/img/x_circle.svg";
import Modal, { ModalCloser } from "./Modal";
import { SPACETIME_SHAPE } from "../utils/js_types";
import { DAYS_OF_WEEK } from "./section/utils";
import TimeInput from "./TimeInput";

const DAY_OF_WEEK_ABREVIATIONS = Object.freeze({
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

export default class Course extends React.Component {
  static propTypes = {
    match: PropTypes.shape({ params: PropTypes.shape({ id: PropTypes.string.isRequired }) }).isRequired,
    /*
     * Name will be false if it hasn't yet been loaded (the relevant request to the API is performed in CourseMenu)
     * We structure things like this in order to avoid a 'waterfall' where we don't start fetching sections until
     * CourseMenu is done with its API requests, making the user suffer twice the latency for no reason.
     */
    name: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]).isRequired,
    isOpen: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = {
      sections: null,
      sectionsLoaded: false,
      currDayGroup: "",
      showUnavailable: false,
      userIsCoordinator: false,
      showModal: false,
      whichModal: COURSE_MODAL_TYPE.createSection
    }; // Sections are grouped by day
    this.reloadSections = this.reloadSections.bind(this);
  }

  reloadSections() {
    const { id } = this.props.match.params;
    fetchJSON(`/courses/${id}/sections`).then(({ sections, userIsCoordinator }) =>
      this.setState({ sections, userIsCoordinator, sectionsLoaded: true, currDayGroup: Object.keys(sections)[0] })
    );
  }

  componentDidMount() {
    this.reloadSections();
  }

  render() {
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
        <div id="course-left-col">
          {userIsCoordinator && (
            <button
              className="csm-btn export-data-btn"
              onClick={() => this.setState({ showModal: true, whichModal: COURSE_MODAL_TYPE.exportData })}
            >
              Export Data
            </button>
          )}
        </div>
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
            <button
              className="csm-btn create-section-btn"
              onClick={() => this.setState({ showModal: true, whichModal: COURSE_MODAL_TYPE.createSection })}
            >
              <span className="inline-plus-sign">+ </span>Create Section
            </button>
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

class SectionCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showModal: false, enrollmentSuccessful: undefined, errorMessage: "" };
    this.enroll = this.enroll.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.modalContents = this.modalContents.bind(this);
  }

  static propTypes = {
    id: PropTypes.number.isRequired,
    spacetimes: PropTypes.arrayOf(SPACETIME_SHAPE.isRequired).isRequired,
    mentor: PropTypes.shape({ name: PropTypes.string.isRequired }),
    numStudentsEnrolled: PropTypes.number.isRequired,
    capacity: PropTypes.number.isRequired,
    description: PropTypes.string,
    userIsCoordinator: PropTypes.bool.isRequired
  };

  enroll() {
    fetchWithMethod(`sections/${this.props.id}/students/`, HTTP_METHODS.PUT)
      .then(response => {
        if (response.ok) {
          this.setState({
            showModal: true,
            enrollmentSuccessful: true
          });
        } else {
          response.json().then(({ detail }) =>
            this.setState({
              showModal: true,
              enrollmentSuccessful: false,
              errorMessage: detail
            })
          );
        }
      })
      .catch(error =>
        this.setState({
          showModal: true,
          enrollmentSuccessful: false,
          errorMessage: String(error)
        })
      );
  }

  closeModal() {
    this.setState({ showModal: false, modalContents: null });
  }

  modalContents() {
    const iconWidth = "8em";
    const iconHeight = "8em";
    if (this.state.enrollmentSuccessful) {
      return (
        <React.Fragment>
          <CheckCircle height={iconHeight} width={iconWidth} />
          <h3>Successfully enrolled</h3>
          <ModalCloser>
            <button className="modal-btn">OK</button>
          </ModalCloser>
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        <XCircle color="#eb6060" height={iconHeight} width={iconWidth} />
        <h3>Enrollment failed</h3>
        <h4>{this.state.errorMessage}</h4>
        <ModalCloser>
          <button className="modal-btn">OK</button>
        </ModalCloser>
      </React.Fragment>
    );
  }

  render() {
    const { spacetimes, mentor, numStudentsEnrolled, capacity, description, userIsCoordinator, id } = this.props;
    const iconWidth = "1.3em";
    const iconHeight = "1.3em";
    const isFull = numStudentsEnrolled >= capacity;
    const { showModal, enrollmentSuccessful } = this.state;
    if (!showModal && enrollmentSuccessful) {
      return <Redirect to="/" />;
    }
    // set of all distinct locations
    const spacetimeLocationSet = new Set();
    for (const spacetime of spacetimes) {
      spacetimeLocationSet.add(spacetime.location);
    }
    // remove the first location because it'll always be displayed
    spacetimeLocationSet.delete(spacetimes[0].location);
    return (
      <React.Fragment>
        {showModal && <Modal closeModal={this.closeModal}>{this.modalContents().props.children}</Modal>}
        <section className={`section-card ${isFull ? "full" : ""}`}>
          <div className="section-card-contents">
            {description && <span className="section-card-description">{description}</span>}
            <p title="Location">
              <LocationIcon width={iconWidth} height={iconHeight} />{" "}
              {spacetimes[0].location === null ? "Online" : spacetimes[0].location}
              {spacetimeLocationSet.size > 0 && (
                <span className="section-card-additional-times">
                  {Array.from(spacetimeLocationSet).map((location, id) => (
                    <React.Fragment key={id}>
                      <span
                        className="section-card-icon-placeholder"
                        style={{ minWidth: iconWidth, minHeight: iconHeight }}
                      />{" "}
                      {location === null ? "Online" : location}
                    </React.Fragment>
                  ))}
                </span>
              )}
            </p>
            <p title="Time">
              <ClockIcon width={iconWidth} height={iconHeight} /> {spacetimes[0].time}
              {spacetimes.length > 1 && (
                <span className="section-card-additional-times">
                  {spacetimes.slice(1).map(({ time, id }) => (
                    <React.Fragment key={id}>
                      <span
                        className="section-card-icon-placeholder"
                        style={{ minWidth: iconWidth, minHeight: iconHeight }}
                      />{" "}
                      {time}
                    </React.Fragment>
                  ))}
                </span>
              )}
            </p>
            <p title="Mentor">
              <UserIcon width={iconWidth} height={iconHeight} /> {mentor.name}
            </p>
            <p title="Current enrollment">
              <GroupIcon width={iconWidth} height={iconHeight} /> {`${numStudentsEnrolled}/${capacity}`}
            </p>
          </div>
          {userIsCoordinator ? (
            <Link to={`/sections/${id}`} className="csm-btn section-card-footer">
              MANAGE
            </Link>
          ) : (
            <div className="csm-btn section-card-footer" onClick={isFull ? undefined : this.enroll}>
              ENROLL
            </div>
          )}
        </section>
      </React.Fragment>
    );
  }
}

class CreateSectionModal extends React.Component {
  static propTypes = {
    courseId: PropTypes.number.isRequired,
    closeModal: PropTypes.func.isRequired,
    reloadSections: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.state = { userEmails: [], mentorEmail: "", spacetimes: [this.makeSpacetime()], description: "", capacity: "" };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.appendSpacetime = this.appendSpacetime.bind(this);
  }

  makeSpacetime() {
    return { dayOfWeek: "", startTime: "", location: "" };
  }

  componentDidMount() {
    fetchJSON("/users/").then(userEmails => this.setState({ userEmails }));
  }

  appendSpacetime(event) {
    event.preventDefault(); // Annoyingly the submit event for the form gets fired, so we have to suppress it
    this.setState({ spacetimes: [...this.state.spacetimes, this.makeSpacetime()] });
  }

  handleChange({ target: { name, value } }) {
    if (name.startsWith("location") || name.startsWith("startTime") || name.startsWith("dayOfWeek")) {
      const { spacetimes } = this.state;
      // Funny JavaScript scoping workaround (let [name, index] = name.split("|") doesn't work)
      let index;
      [name, index] = name.split("|");
      index = Number(index);
      this.setState({
        spacetimes: [
          ...spacetimes.slice(0, index),
          { ...spacetimes[index], [name]: value },
          ...spacetimes.slice(index + 1)
        ]
      });
    } else {
      this.setState({ [name]: value });
    }
  }

  handleSubmit(event) {
    event.preventDefault();
    // eslint-disable-next-line no-unused-vars
    const { userEmails: _, ...data } = this.state;
    const { courseId, reloadSections, closeModal } = this.props;
    data.courseId = courseId;
    //TODO: Handle API Failure
    fetchWithMethod("/sections", HTTP_METHODS.POST, data).then(() => {
      closeModal();
      reloadSections();
    });
  }

  render() {
    const { closeModal } = this.props;
    const { mentorEmail, userEmails, capacity, description, spacetimes } = this.state;
    return (
      <Modal closeModal={closeModal}>
        <form id="create-section-form" className="csm-form" onSubmit={this.handleSubmit}>
          <div id="create-section-form-contents">
            <div id="non-spacetime-fields">
              <label>
                Mentor Email
                <input
                  onChange={this.handleChange}
                  type="email"
                  list="user-email-list"
                  required
                  name="mentorEmail"
                  pattern=".+@berkeley.edu$"
                  title="Please enter a valid @berkeley.edu email address"
                  value={mentorEmail}
                  autoFocus
                />
                <datalist id="user-email-list">
                  {userEmails.map(email => (
                    <option key={email} value={email} />
                  ))}
                </datalist>
              </label>
              <label>
                Capacity
                <input
                  required
                  name="capacity"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={capacity}
                  onChange={this.handleChange}
                />
              </label>
              <label name="description">
                Description
                <input name="description" type="text" value={description} onChange={this.handleChange} />
              </label>
            </div>
            {spacetimes.map(({ dayOfWeek, startTime, location }, index) => (
              <React.Fragment key={index}>
                <h4 className="spacetime-fields-header">Weekly occurence {index + 1}</h4>
                <div className="spacetime-fields">
                  <label>
                    Location
                    <input
                      onChange={this.handleChange}
                      required
                      title="You cannot leave this field blank"
                      pattern=".*[^\s]+.*"
                      type="text"
                      name={`location|${index}`}
                      value={location}
                    />
                  </label>
                  <label>
                    Day
                    <select onChange={this.handleChange} name={`dayOfWeek|${index}`} value={dayOfWeek} required>
                      {["---"].concat(DAYS_OF_WEEK).map(day => (
                        <option key={day} value={day === "---" ? "" : day} disabled={day === "---"}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Time
                    <TimeInput onChange={this.handleChange} required name={`startTime|${index}`} value={startTime} />
                  </label>
                  {index === spacetimes.length - 1 && (
                    <button className="csm-btn" id="add-occurence-btn" onClick={this.appendSpacetime}>
                      Add another occurence
                    </button>
                  )}
                </div>
              </React.Fragment>
            ))}
            <input type="submit" value="Create Section" />
          </div>
        </form>
      </Modal>
    );
  }
}

/**
 * @function DataExportModal
 * @component
 * @param {DataExportModal.propTypes} props
 * @returns Modal that coords use to export a csv of student emails
 *          in selected courses.
 */
function DataExportModal(props) {
  // Need to move to parent if rerequest coursedata everytime
  /**
   * @state courseMap : map of course ID to course name
   */
  const [courseMap, setCourseMap] = useState(null);
  /**
   * @state {boolean} courseLoaded : true if course data has been
   *        loaded
   */
  const [courseLoaded, setCourseLoaded] = useState(false);
  /**
   * @state courseChecks : map of course id to boolean (if checkmarked)
   */
  const [courseChecks, setCourseChecks] = useState([]);

  useEffect(() => {
    fetchJSON("/courses").then(courses => {
      const coursesById = new Map();
      const courseCheckbyId = new Map();
      for (const course of courses) {
        coursesById.set(course.id, course.name);
        courseCheckbyId.set(course.id, false);
      }
      setCourseMap(coursesById);
      setCourseChecks(courseCheckbyId);
      setCourseLoaded(true);
    });
  }, []);

  function getStudentEmails() {
    const courses = Array.from(courseChecks.keys())
      .filter(id => courseChecks.get(id))
      .join();
    if (!courses || courses.length === 0) {
      alert("select something to download");
      return;
    }
    window.open(normalizeEndpoint(`/courses/students/?ids=${courses}`));
  }

  const updateCourseChecks = (k, v) => {
    setCourseChecks(new Map(courseChecks.set(k, v)));
  };

  function renderCheckGrid() {
    const checks = Array.from(courseMap.keys()).map(i => renderCheck(i));
    return <div className="data-export-checkbox-grid">{checks}</div>;
  }

  function renderCheck(i) {
    return (
      <div className="data-export-checkbox">
        <label>
          <Checkbox
            checked={courseChecks.get(i)}
            onChange={() => {
              updateCourseChecks(i, !courseChecks.get(i));
            }}
          />
          <span>{courseMap.get(i)}</span>
        </label>
      </div>
    );
  }

  return (
    <Modal closeModal={props.closeModal}>
      <div className="data-export-modal">
        <div className="data-export-modal-header">Download csv of student emails in selected courses</div>
        <div className="data-export-modal-selection">
          {!courseLoaded ? <LoadingSpinner id="course-menu-loading-spinner" /> : renderCheckGrid()}
        </div>
        <div className="data-export-modal-download">
          <button className="csm-btn export-data-btn" onClick={getStudentEmails}>
            Download
          </button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * @interface shape of DataExportModal.props
 *
 * @prop {function} closeModal : closes Modal
 */
DataExportModal.propTypes = {
  closeModal: PropTypes.func.isRequired
};

const Checkbox = props => <input type="checkbox" {...props} />;
