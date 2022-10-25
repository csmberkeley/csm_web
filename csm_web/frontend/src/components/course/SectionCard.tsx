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
import { Mentor, Spacetime } from "../../utils/types";

interface SectionCardProps {
  id: number;
  spacetimes: Spacetime[];
  mentor: Mentor;
  numStudentsEnrolled: number;
  capacity: number;
  description: string;
  userIsCoordinator: boolean;
  courseOpen: boolean;
}

export const SectionCard = ({
  id,
  spacetimes,
  mentor,
  numStudentsEnrolled,
  capacity,
  description,
  userIsCoordinator,
  courseOpen
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
   * The error message if the enrollment failed.
   */
  const [errorMessage, setErrorMessage] = useState<string>("");

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
        } else {
          response.json().then(({ detail }: FetchJSON) => {
            setShowModal(true);
            setEnrollmentSuccessful(false);
            setErrorMessage(detail);
          });
        }
      })
      .catch((error: any) => {
        setShowModal(true);
        setEnrollmentSuccessful(false);
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
        <h4>{errorMessage}</h4>
        <ModalCloser>
          <button className="modal-btn">OK</button>
        </ModalCloser>
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
          {description && <span className="section-card-description">{description}</span>}
          <div className="add-section-btn"> </div>
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
            className={`csm-btn section-card-footer ${courseOpen ? "" : "disabled"}`}
            onClick={isFull ? undefined : enroll}
          >
            ENROLL
          </div>
        )}
      </section>
    </React.Fragment>
  );
};
