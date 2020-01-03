import React from "react";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import LocationIcon from "../../static/frontend/img/location.svg";
import UserIcon from "../../static/frontend/img/user.svg";
import GroupIcon from "../../static/frontend/img/group.svg";
import ClockIcon from "../../static/frontend/img/clock.svg";
import CheckCircle from "../../static/frontend/img/check_circle.svg";
import XCircle from "../../static/frontend/img/x_circle.svg";
import Modal, { ModalCloser } from "./Modal";

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
  state = { sections: null, loaded: false, day: "", showUnavailable: true }; // Sections are grouped by day

  static propTypes = {
    match: PropTypes.shape({ params: PropTypes.shape({ id: PropTypes.string.isRequired }) }).isRequired,
    name: PropTypes.string.isRequired
  };

  componentDidMount() {
    const { id } = this.props.match.params;
    fetchJSON(`/courses/${id}/sections`).then(sections =>
      this.setState({ sections, loaded: true, day: Object.keys(sections)[0] })
    );
  }

  render() {
    const { loaded, sections, day: currDay } = this.state;
    return !loaded ? null : (
      <div id="course-section-selector">
        <div id="course-section-controls">
          <h2 className="course-title">{this.props.name}</h2>
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
        </div>
        <div id="course-section-list">
          {sections[currDay]
            .filter(({ numStudentsEnrolled, capacity }) => this.state.showUnavailable || numStudentsEnrolled < capacity)
            .map(section => (
              <SectionCard key={section.id} {...section} />
            ))}
        </div>
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
    location: PropTypes.string,
    time: PropTypes.string.isRequired,
    mentor: PropTypes.shape({ name: PropTypes.string.isRequired }),
    numStudentsEnrolled: PropTypes.number.isRequired,
    capacity: PropTypes.number.isRequired
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
    const iconWidth = "10em";
    const iconHeight = "10em";
    if (this.state.enrollmentSuccessful) {
      return (
        <React.Fragment>
          <CheckCircle color="green" height={iconHeight} width={iconWidth} />
          <h3>Successfully enrolled</h3>
          <ModalCloser>
            <button className="modal-btn">OK</button>
          </ModalCloser>
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        <XCircle color="red" height={iconHeight} width={iconWidth} />
        <h3>Enrollment failed</h3>
        <h4>{this.state.errorMessage}</h4>
        <ModalCloser>
          <button className="modal-btn">OK</button>
        </ModalCloser>
      </React.Fragment>
    );
  }

  render() {
    const { location, time, mentor, numStudentsEnrolled, capacity } = this.props;
    const iconWidth = "1.3em";
    const iconHeight = "1.3em";
    const isFull = numStudentsEnrolled >= capacity;
    return (
      <React.Fragment>
        {this.state.showModal && <Modal closeModal={this.closeModal}>{this.modalContents().props.children}</Modal>}
        <section className={`section-card ${isFull ? "full" : ""}`}>
          <div className="section-card-contents">
            <p title="Location">
              <LocationIcon width={iconWidth} height={iconHeight} /> {location}
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
          <div className="csm-btn section-card-footer" onClick={isFull ? undefined : this.enroll}>
            ENROLL
          </div>
        </section>
      </React.Fragment>
    );
  }
}
