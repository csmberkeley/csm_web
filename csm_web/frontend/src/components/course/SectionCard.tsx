import React from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Link, Redirect } from "react-router-dom";
import LocationIcon from "../../../static/frontend/img/location.svg";
import UserIcon from "../../../static/frontend/img/user.svg";
import GroupIcon from "../../../static/frontend/img/group.svg";
import ClockIcon from "../../../static/frontend/img/clock.svg";
import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import XCircle from "../../../static/frontend/img/x_circle.svg";
import Modal, { ModalCloser } from "../Modal";
import { Mentor, Spacetime } from "../../utils/types";

interface SectionCardProps {
  id: number;
  spacetimes: Spacetime[];
  mentor: Mentor;
  numStudentsEnrolled: number;
  capacity: number;
  description: string;
  userIsCoordinator: boolean;
}

interface SectionCardState {
  showModal: boolean;
  enrollmentSuccessful?: boolean;
  errorMessage: string;
}

export class SectionCard extends React.Component<SectionCardProps, SectionCardState> {
  constructor(props: SectionCardProps) {
    super(props);
    this.state = { showModal: false, enrollmentSuccessful: undefined, errorMessage: "" };
    this.enroll = this.enroll.bind(this);
    this.closeModal = this.closeModal.bind(this);
    this.modalContents = this.modalContents.bind(this);
  }

  enroll() {
    interface FetchJSON {
      detail: string;
    }

    fetchWithMethod(`sections/${this.props.id}/students/`, HTTP_METHODS.PUT)
      .then((response: { ok: boolean; json: () => Promise<FetchJSON> }) => {
        if (response.ok) {
          this.setState({
            showModal: true,
            enrollmentSuccessful: true
          });
        } else {
          response.json().then(({ detail }: FetchJSON) =>
            this.setState({
              showModal: true,
              enrollmentSuccessful: false,
              errorMessage: detail
            })
          );
        }
      })
      .catch((error: any) =>
        this.setState({
          showModal: true,
          enrollmentSuccessful: false,
          errorMessage: String(error)
        })
      );
  }

  closeModal() {
    this.setState({ showModal: false });
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
