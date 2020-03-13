import React from "react";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import { Redirect, Link } from "react-router-dom";
import LocationIcon from "../../static/frontend/img/location.svg";
import UserIcon from "../../static/frontend/img/user.svg";
import GroupIcon from "../../static/frontend/img/group.svg";
import ClockIcon from "../../static/frontend/img/clock.svg";
import CheckCircle from "../../static/frontend/img/check_circle.svg";
import XCircle from "../../static/frontend/img/x_circle.svg";
import Modal, { ModalCloser } from "./Modal";
import { SPACETIME_SHAPE } from "../utils/types";
import { DAYS_OF_WEEK } from "./MentorSection";
import TimeInput from "./TimeInput";

const DAY_OF_WEEK_ABREVIATIONS = Object.freeze({
  Mon: "M",
  Tue: "Tu",
  Wed: "W",
  Thu: "Th",
  Fri: "F",
  Sat: "Sa",
  Sun: "Su"
});

export default class Course extends React.Component {
  static propTypes = {
    match: PropTypes.shape({ params: PropTypes.shape({ id: PropTypes.string.isRequired }) }).isRequired,
    /*
     * Name will be false if it hasn't yet been loaded (the relevant request to the API is performed in CourseMenu)
     * We structure things like this in order to avoid a 'waterfall' where we don't start fetching sections until
     * CourseMenu is done with its API requests, making the user suffer twice the latency for no reason.
     */
    name: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]).isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      sections: null,
      sectionsLoaded: false,
      day: "",
      showUnavailable: true,
      userIsCoordinator: false,
      showModal: false
    }; // Sections are grouped by day
    this.reloadSections = this.reloadSections.bind(this);
  }

  reloadSections() {
    const { id } = this.props.match.params;
    fetchJSON(`/courses/${id}/sections`).then(({ sections, userIsCoordinator }) =>
      this.setState({ sections, userIsCoordinator, sectionsLoaded: true, day: Object.keys(sections)[0] })
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
      name
    } = this.props;
    const { sectionsLoaded, sections, day: currDay, showUnavailable, userIsCoordinator, showModal } = this.state;
    let currDaySections = sections && sections[currDay];
    if (currDaySections && !showUnavailable) {
      currDaySections = currDaySections.filter(({ numStudentsEnrolled, capacity }) => numStudentsEnrolled < capacity);
    }
    return !(name && sectionsLoaded) ? null : (
      <div id="course-section-selector">
        <div id="course-section-controls">
          <h2 className="course-title">{name}</h2>
          <div id="day-selector">
            {Object.keys(sections).map(day => (
              <button
                className={`day-btn ${day == currDay ? "active" : ""}`}
                key={day}
                onClick={() => this.setState({ day })}
              >
                {DAY_OF_WEEK_ABREVIATIONS[day]}
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
            <button className="csm-btn create-section-btn" onClick={() => this.setState({ showModal: true })}>
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
        {userIsCoordinator && showModal && (
          <CreateSectionModal
            reloadSections={this.reloadSections}
            closeModal={() => this.setState({ showModal: false })}
            courseId={Number(id)}
          />
        )}
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
    spacetime: SPACETIME_SHAPE.isRequired,
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
    const {
      spacetime: { location, time },
      mentor,
      numStudentsEnrolled,
      capacity,
      description,
      userIsCoordinator,
      id
    } = this.props;
    const iconWidth = "1.3em";
    const iconHeight = "1.3em";
    const isFull = numStudentsEnrolled >= capacity;
    const { showModal, enrollmentSuccessful } = this.state;
    if (!showModal && enrollmentSuccessful) {
      return <Redirect to="/" />;
    }
    return (
      <React.Fragment>
        {showModal && <Modal closeModal={this.closeModal}>{this.modalContents().props.children}</Modal>}
        <section className={`section-card ${isFull ? "full" : ""}`}>
          <div className="section-card-contents">
            {description && <span className="section-card-description">{description}</span>}
            <p title="Location">
              <LocationIcon width={iconWidth} height={iconHeight} />{" "}
              {location.match(/^https?:\/\//) ? "Online" : location}
            </p>
            <p title="Time">
              <ClockIcon width={iconWidth} height={iconHeight} /> {time}
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
    this.state = { userEmails: [], mentorEmail: "", day: "", time: "", location: "", description: "", capacity: "" };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentDidMount() {
    fetchJSON("/users/").then(userEmails => this.setState({ userEmails }));
  }

  handleChange({ target: { name, value } }) {
    this.setState({ [name]: value });
  }

  handleSubmit(event) {
    event.preventDefault();
    const { day: dayOfWeek, time: startTime, location, description, capacity, mentorEmail } = this.state;
    const { courseId, reloadSections, closeModal } = this.props;
    const data = { spacetime: { dayOfWeek, startTime, location }, description, capacity, mentorEmail, courseId };
    //TODO: Handle API Failure
    fetchWithMethod("/sections", HTTP_METHODS.POST, data).then(() => {
      closeModal();
      reloadSections();
    });
  }

  render() {
    const { closeModal } = this.props;
    const { mentorEmail, userEmails, capacity, description, day, time, location } = this.state;
    return (
      <Modal closeModal={closeModal}>
        <form id="create-section-form" className="csm-form" onSubmit={this.handleSubmit}>
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
          <label>
            Description
            <input name="description" type="text" value={description} onChange={this.handleChange} />
          </label>
          <label>
            Location
            <input
              onChange={this.handleChange}
              required
              title="You cannot leave this field blank"
              pattern=".*[^\s]+.*"
              type="text"
              name="location"
              value={location}
            />
          </label>
          <label>
            Day
            <select onChange={this.handleChange} name="day" value={day} required>
              {[["", "---"]].concat(Object.entries(DAYS_OF_WEEK)).map(([value, label]) => (
                <option key={value} value={value} disabled={!value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time
            <TimeInput onChange={this.handleChange} required name="time" value={time} />
          </label>
          <input type="submit" value="Create Section" />
        </form>
      </Modal>
    );
  }
}
