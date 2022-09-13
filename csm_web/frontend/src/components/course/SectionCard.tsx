import React, { useState } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Link, Redirect } from "react-router-dom";
import LocationIcon from "../../../static/frontend/img/location.svg";
import UserIcon from "../../../static/frontend/img/user.svg";
import GroupIcon from "../../../static/frontend/img/group.svg";
import ClockIcon from "../../../static/frontend/img/clock.svg";
import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import XCircle from "../../../static/frontend/img/x_circle.svg";
import Modal, { ModalCloser } from "../Modal";
import { Mentor, Spacetime, Label as LabelType } from "../../utils/types";

interface SectionCardProps {
  id: number;
  spacetimes: Spacetime[];
  mentor: Mentor;
  numStudentsEnrolled: number;
  capacity: number;
  userIsCoordinator: boolean;
  courseOpen: boolean;
  labels: LabelType[];
}

export const SectionCard = ({
  id,
  spacetimes,
  mentor,
  numStudentsEnrolled,
  capacity,
  userIsCoordinator,
  courseOpen,
  labels
}: SectionCardProps): React.ReactElement => {
  /**
   * Whether to show the modal (after an attempt to enroll).
   */
  const [showModal, setShowModal] = useState<boolean>(false);
  /**
   * Whether the enrollment was successful.
   */
  const [enrollmentSuccessful, setEnrollmentSuccessful] = useState<boolean>(undefined as never);
  /**
   * Whether the confirmation process is occurring.
   */
  const [confirmationProcess, setConfirmationProcess] = useState<boolean>(undefined as never);
  /**
   * The error message if the enrollment failed.
   */
  const [errorMessage, setErrorMessage] = useState<string>("");

  /**
   * Handle the confirmation process in the section.
   */
  const confirm = () => {
    setShowModal(true);
    setConfirmationProcess(true);
  };

  const labelsShouldShowPopup = () => {
    if (labels.length == 0) {
      return false;
    }
    return labels
      .map(label => label.showPopup)
      .some(function (popup) {
        return popup;
      });
  };

  /**
   * Handle enrollment in the section.
   */
  const enroll = () => {
    interface FetchJSON {
      detail: string;
    }

    if (!courseOpen) {
      setShowModal(true);
      setEnrollmentSuccessful(false);
      setErrorMessage("The course is not open for enrollment.");
      return;
    }

    fetchWithMethod(`sections/${id}/students/`, HTTP_METHODS.PUT)
      .then((response: { ok: boolean; json: () => Promise<FetchJSON> }) => {
        if (response.ok) {
          setShowModal(true);
          setEnrollmentSuccessful(true);
          setConfirmationProcess(false);
        } else {
          response.json().then(({ detail }: FetchJSON) => {
            setShowModal(true);
            setEnrollmentSuccessful(false);
            setConfirmationProcess(false);
            setErrorMessage(detail);
          });
        }
      })
      .catch((error: any) => {
        setShowModal(true);
        setEnrollmentSuccessful(false);
        setConfirmationProcess(false);
        setErrorMessage(String(error));
      });
  };

  /**
   * Handle closeing of the modal.
   */
  const closeModal = () => {
    setShowModal(false);
  };

  /**
   * Render modal contents after an attempt to enroll in the section.
   */
  const modalContents = () => {
    const iconWidth = "8em";
    const iconHeight = "8em";
    if (enrollmentSuccessful) {
      return (
        <React.Fragment>
          <CheckCircle height={iconHeight} width={iconWidth} />
          <h3>Successfully enrolled</h3>
          <div className="modal-confirmation-container">
            <ModalCloser>
              <button className="modal-btn">OK</button>
            </ModalCloser>
          </div>
        </React.Fragment>
      );
    } else if (confirmationProcess) {
      return (
        <React.Fragment>
          <CheckCircle height={iconHeight} width={iconWidth} />
          <p>Please confirm that you want to enroll in a section with this affinity: </p>
          <ul>
            {labels.map((label: LabelType) => (
              <li key={label.id}>
                {label.name}: {label.description}
              </li>
            ))}
          </ul>
          <div className="modal-confirmation-container">
            <ModalCloser>
              <button className="label-btn">Cancel</button>
            </ModalCloser>

            <button className="label-btn" onClick={enroll}>
              Confirm
            </button>
          </div>
        </React.Fragment>
      );
    }
    return (
      <React.Fragment>
        <XCircle color="#eb6060" height={iconHeight} width={iconWidth} />
        <h3>Enrollment failed</h3>
        <h4>{errorMessage}</h4>
        <div className="modal-confirmation-container">
          <ModalCloser>
            <button className="modal-btn">OK</button>
          </ModalCloser>
        </div>
      </React.Fragment>
    );
  };

  const iconWidth = "1.3em";
  const iconHeight = "1.3em";
  const isFull = numStudentsEnrolled >= capacity;
  if (!showModal && enrollmentSuccessful) {
    // redirect to the section page if the user was successfully enrolled in the section
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
      {showModal && <Modal closeModal={closeModal}>{modalContents().props.children}</Modal>}
      <section className={`section-card ${isFull ? "full" : ""}`}>
        <div className="section-card-contents">
          {labels.length > 0 && (
            <span className="section-card-description">
              {labels.length > 1 ? labels.map(label => label.name).join(", ") : labels[0].name}
            </span>
          )}
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
          <div
            className="csm-btn section-card-footer"
            onClick={isFull ? undefined : labelsShouldShowPopup() ? confirm : enroll}
          >
            ENROLL
          </div>
        )}
      </section>
    </React.Fragment>
  );
};
