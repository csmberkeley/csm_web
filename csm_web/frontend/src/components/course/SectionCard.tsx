import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { formatSpacetimeInterval } from "../../utils/datetime";
import { EnrollUserMutationResponse, useEnrollUserMutation } from "../../utils/queries/sections";
import { Mentor, Spacetime } from "../../utils/types";
import Modal, { ModalCloser } from "../Modal";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import ClockIcon from "../../../static/frontend/img/clock.svg";
import GroupIcon from "../../../static/frontend/img/group.svg";
import LocationIcon from "../../../static/frontend/img/location.svg";
import UserIcon from "../../../static/frontend/img/user.svg";
import XCircle from "../../../static/frontend/img/x_circle.svg";

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
   * Mutation to enroll a student in the section.
   */
  const enrollStudentMutation = useEnrollUserMutation(id);

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
    if (!courseOpen) {
      setShowModal(true);
      setEnrollmentSuccessful(false);
      setErrorMessage("The course is not open for enrollment.");
      return;
    }

    enrollStudentMutation.mutate(undefined, {
      onSuccess: () => {
        setEnrollmentSuccessful(true);
        setShowModal(true);
      },
      onError: ({ detail }: EnrollUserMutationResponse) => {
        setEnrollmentSuccessful(false);
        setErrorMessage(detail);
        setShowModal(true);
      }
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
        <div className="enroll-confirm-modal-contents">
          <CheckCircle height={iconHeight} width={iconWidth} />
          <h3>Successfully enrolled</h3>
          <h4>To view and update your profile, click the button below</h4>
          <Link className="primary-btn" to="/profile">
            <UserIcon className="user-icon" />
            Profile
          </Link>
        </div>
      );
    }
    return (
      <div className="enroll-confirm-modal-contents">
        <XCircle color="#eb6060" height={iconHeight} width={iconWidth} />
        <h3>Enrollment failed</h3>
        <h4>{errorMessage}</h4>
        <ModalCloser>
          <button className="primary-btn">OK</button>
        </ModalCloser>
      </div>
    );
  };

  const iconWidth = "1.3em";
  const iconHeight = "1.3em";
  const isFull = numStudentsEnrolled >= capacity;
  if (!showModal && enrollmentSuccessful) {
    // redirect to the section page if the user was successfully enrolled in the section
    return <Navigate to="/" />;
  }

  // set of all distinct locations
  const spacetimeLocationSet = new Set<string | undefined>();
  for (const spacetime of spacetimes) {
    spacetimeLocationSet.add(spacetime.location);
  }
  // remove the first location because it'll always be displayed
  spacetimeLocationSet.delete(spacetimes[0].location);

  return (
    <React.Fragment>
      {showModal && <Modal closeModal={closeModal}>{modalContents()}</Modal>}
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
            <ClockIcon width={iconWidth} height={iconHeight} /> {formatSpacetimeInterval(spacetimes[0])}
            {spacetimes.length > 1 && (
              <span className="section-card-additional-times">
                {spacetimes.slice(1).map(spacetime => (
                  <React.Fragment key={spacetime.id}>
                    <span
                      className="section-card-icon-placeholder"
                      style={{ minWidth: iconWidth, minHeight: iconHeight }}
                    />{" "}
                    {formatSpacetimeInterval(spacetime)}
                  </React.Fragment>
                ))}
              </span>
            )}
          </p>
          <p title="Mentor">
            <UserIcon width={iconWidth} height={iconHeight} />{" "}
            <Link className="hyperlink" to={`/profile/${mentor.user.id}`}>
              {mentor.name}
            </Link>
          </p>
          <p title="Current enrollment">
            <GroupIcon width={iconWidth} height={iconHeight} /> {`${numStudentsEnrolled}/${capacity}`}
          </p>
        </div>
        {userIsCoordinator ? (
          <Link to={`/sections/${id}`} className="primary-btn section-card-footer">
            MANAGE
          </Link>
        ) : (
          <button
            className={`primary-btn section-card-footer`}
            disabled={!courseOpen || isFull}
            onClick={isFull ? undefined : enroll}
          >
            ENROLL
          </button>
        )}
      </section>
    </React.Fragment>
  );
};
