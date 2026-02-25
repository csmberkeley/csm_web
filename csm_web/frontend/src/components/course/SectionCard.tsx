import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";

import { formatSpacetimeInterval } from "../../utils/datetime";
import { useProfiles } from "../../utils/queries/base";
import {
  EnrollUserMutationResponse,
  useEnrollUserMutation,
  useEnrollStudentToWaitlistMutation
} from "../../utils/queries/sections";
import { Mentor, Role, Spacetime } from "../../utils/types";
import Modal, { ModalCloser } from "../Modal";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import ClockIcon from "../../../static/frontend/img/clock.svg";
import GroupIcon from "../../../static/frontend/img/group.svg";
import LocationIcon from "../../../static/frontend/img/location.svg";
import UserIcon from "../../../static/frontend/img/user.svg";
import WaitlistIcon from "../../../static/frontend/img/waitlist.svg";
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
  numStudentsWaitlisted: number;
  waitlistCapacity: number;
  courseId: number;
}

export const SectionCard = ({
  id,
  spacetimes,
  mentor,
  numStudentsEnrolled,
  capacity,
  description,
  userIsCoordinator,
  courseOpen,
  numStudentsWaitlisted,
  waitlistCapacity,
  courseId
}: SectionCardProps): React.ReactElement => {
  /**
   * Mutation to enroll a student in the section.
   */
  const enrollStudentMutation = useEnrollUserMutation(id);
  /**
   * Mutation to enroll a student in the section's waitlist.
   */
  const enrollStudentWaitlistMutation = useEnrollStudentToWaitlistMutation(id);

  const { data: profiles } = useProfiles();

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
   * Whether to show the swap/waitlist confirmation modal.
   */
  const [showSwapConfirm, setShowSwapConfirm] = useState<boolean>(false);
  /**
   * Whether the pending action is a waitlist join (vs direct enroll).
   */
  const [pendingIsWaitlist, setPendingIsWaitlist] = useState<boolean>(false);

  /**
   * Check if the user is already enrolled in another section of this course.
   */
  const isAlreadyEnrolled = profiles?.some(p => p.courseId === courseId && p.role === Role.STUDENT) ?? false;

  /**
   * Perform the actual mutation (enroll or waitlist).
   */
  const performEnroll = (useWaitlist: boolean) => {
    const mutation = useWaitlist ? enrollStudentWaitlistMutation : enrollStudentMutation;
    mutation.mutate(undefined, {
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
   * Handle enrollment in the section.
   */
  const enroll = () => {
    if (!courseOpen) {
      setShowModal(true);
      setEnrollmentSuccessful(false);
      setErrorMessage("The course is not open for enrollment.");
      return;
    }

    // Determine if we should use waitlist mutation (enrolled capacity is full but waitlist is not full)
    const isEnrolledFull = numStudentsEnrolled >= capacity;
    const shouldUseWaitlist = isEnrolledFull && numStudentsWaitlisted < waitlistCapacity;

    // If user is already enrolled in another section, show a confirmation warning
    if (isAlreadyEnrolled) {
      setPendingIsWaitlist(shouldUseWaitlist);
      setShowSwapConfirm(true);
      return;
    }

    performEnroll(shouldUseWaitlist);
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
          <ModalCloser>
            <button className="primary-btn">OK</button>
          </ModalCloser>
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
  const isFull = numStudentsEnrolled >= capacity && numStudentsWaitlisted >= waitlistCapacity;
  const isEnrolledFull = numStudentsEnrolled >= capacity;
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
      {showSwapConfirm && (
        <Modal closeModal={() => setShowSwapConfirm(false)}>
          <div className="enroll-confirm-modal-contents">
            {pendingIsWaitlist ? (
              <>
                <h3>Join waitlist?</h3>
                <p style={{ margin: "0.5em 1.5em", textAlign: "center" }}>
                  You are currently enrolled in another section of this course. When a spot opens up on this waitlist,
                  you will be <strong>automatically dropped</strong> from your current section and enrolled in this one.
                </p>
              </>
            ) : (
              <>
                <h3>Switch sections?</h3>
                <p style={{ margin: "0.5em 1.5em", textAlign: "center" }}>
                  You are currently enrolled in another section of this course. Enrolling here will{" "}
                  <strong>drop you from your current section</strong> and enroll you in this one.
                </p>
              </>
            )}
            <div style={{ display: "flex", gap: "1em", marginTop: "1em" }}>
              <button className="secondary-btn" onClick={() => setShowSwapConfirm(false)}>
                Cancel
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  setShowSwapConfirm(false);
                  performEnroll(pendingIsWaitlist);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </Modal>
      )}
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
            <UserIcon width={iconWidth} height={iconHeight} /> {mentor.name}
          </p>
          <p title="Current enrollment">
            <GroupIcon width={iconWidth} height={iconHeight} /> {`Enrolled: ${numStudentsEnrolled}/${capacity}`}
          </p>
          <p title="Current waitlist">
            <WaitlistIcon width={iconWidth} height={iconHeight} />{" "}
            {`Waitlisted: ${numStudentsWaitlisted}/${waitlistCapacity}`}
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
            {isFull ? "FULL" : isEnrolledFull ? "JOIN WAITLIST" : "ENROLL"}
          </button>
        )}
      </section>
    </React.Fragment>
  );
};
