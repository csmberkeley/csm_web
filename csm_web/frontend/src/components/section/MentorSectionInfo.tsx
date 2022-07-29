import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../utils/api";
import { Mentor, Spacetime, Student, Label } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import { InfoCard, SectionSpacetime } from "./Section";
import { CoordinatorAddStudentModal } from "./CoordinatorAddStudentModal";
import SpacetimeEditModal from "./SpacetimeEditModal";
import StudentDropper from "./StudentDropper";

import XIcon from "../../../static/frontend/img/x.svg";
import PencilIcon from "../../../static/frontend/img/pencil.svg";
import MetaEditModal from "./MetaEditModal";
import SpacetimeDeleteModal from "./SpacetimeDeleteModal";

enum ModalStates {
  NONE = "NONE",
  SPACETIME_EDIT = "SPACETIME_EDIT",
  META_EDIT = "META_EDIT",
  SPACETIME_DELETE = "SPACETIME_DELETE"
}

interface MentorSectionInfoProps {
  students: Student[];
  loaded: boolean;
  spacetimes: Spacetime[];
  reloadSection: () => void;
  isCoordinator: boolean;
  mentor: Mentor;
  capacity: number;
  labelSet: Label[];
  id: number;
}

export default function MentorSectionInfo({
  students,
  loaded,
  spacetimes,
  reloadSection,
  isCoordinator,
  mentor,
  capacity,
  id,
  labelSet
}: MentorSectionInfoProps) {
  const [showModal, setShowModal] = useState(ModalStates.NONE);
  const [focusedSpacetimeID, setFocusedSpacetimeID] = useState<number>(-1);
  const [userEmails, setUserEmails] = useState<string[]>([]);
  const [isAddingStudent, setIsAddingStudent] = useState<boolean>(false);
  const [deleteType, setDeleteType] = useState<boolean>(false);
  useEffect(() => {
    if (!isCoordinator) {
      return;
    }
    fetchJSON("/users/").then(userEmails => setUserEmails(userEmails));
  }, [id, isCoordinator]);
  const closeModal = () => setShowModal(ModalStates.NONE);
  const closeAddModal = (reload = false) => {
    setIsAddingStudent(false);
    if (reload) {
      reloadSection();
    }
  };
  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">{`${
        isCoordinator ? `${mentor.name || mentor.email}'s` : "My"
      } Section`}</h3>
      <div className="section-info-cards-container">
        <InfoCard title="Students">
          {loaded && (
            <React.Fragment>
              <table id="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {(students.length === 0 ? [{ name: "No students enrolled", email: "", id: -1 }] : students).map(
                    ({ name, email, id }: Student) => (
                      <tr key={id}>
                        <td>
                          {isCoordinator && id !== -1 && (
                            <StudentDropper name={name ? name : email} id={id} reloadSection={reloadSection} />
                          )}
                          <span className="student-info">{name || email}</span>
                        </td>
                      </tr>
                    )
                  )}
                  {isCoordinator && (
                    <React.Fragment>
                      <tr>
                        <td>
                          <button className="coordinator-email-modal-button" onClick={() => setIsAddingStudent(true)}>
                            Add students
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  )}
                </tbody>
              </table>
              {isCoordinator && isAddingStudent && (
                <CoordinatorAddStudentModal closeModal={closeAddModal} userEmails={userEmails} sectionId={id} />
              )}
            </React.Fragment>
          )}
          {!loaded && <LoadingSpinner />}
        </InfoCard>
        <div className="section-info-cards-right">
          {spacetimes.map(({ override, ...spacetime }, index) => (
            <SectionSpacetime
              manySpacetimes={spacetimes.length > 1}
              index={index}
              key={spacetime.id}
              spacetime={spacetime}
              override={override}
            >
              {showModal === ModalStates.SPACETIME_EDIT && focusedSpacetimeID === spacetime.id && (
                <SpacetimeEditModal
                  key={spacetime.id}
                  reloadSection={reloadSection}
                  defaultSpacetime={spacetime}
                  closeModal={closeModal}
                  editingOverride={deleteType}
                />
              )}
              {showModal === ModalStates.SPACETIME_DELETE && focusedSpacetimeID === spacetime.id && (
                <SpacetimeDeleteModal
                  spacetimeId={spacetime.id}
                  closeModal={closeModal}
                  reloadSection={reloadSection}
                  overrideDelete={deleteType}
                />
              )}
              {spacetimes.length > 1 && isCoordinator && (
                <button
                  className="delete-spacetime-btn"
                  onClick={() => {
                    setShowModal(ModalStates.SPACETIME_DELETE);
                    setFocusedSpacetimeID(spacetime.id);
                    setDeleteType(false);
                  }}
                >
                  <XIcon width="1em" height="1em" /> Delete
                </button>
              )}
              {override && (
                <button
                  className="delete-override-btn"
                  onClick={() => {
                    setShowModal(ModalStates.SPACETIME_DELETE);
                    setFocusedSpacetimeID(spacetime.id);
                    setDeleteType(true);
                  }}
                >
                  <XIcon width="1em" height="1em" /> Delete
                </button>
              )}
              <button
                className="info-card-edit-btn"
                onClick={() => {
                  setShowModal(ModalStates.SPACETIME_EDIT);
                  setFocusedSpacetimeID(spacetime.id);
                  setDeleteType(false);
                }}
              >
                <PencilIcon width="1em" height="1em" /> Edit
              </button>
              {override && (
                <button
                  className="override-info-card-edit-btn"
                  onClick={() => {
                    setShowModal(ModalStates.SPACETIME_EDIT);
                    setFocusedSpacetimeID(spacetime.id);
                    setDeleteType(true);
                  }}
                >
                  <PencilIcon width="1em" height="1em" /> Edit
                </button>
              )}
            </SectionSpacetime>
          ))}

          <InfoCard title="Meta">
            {isCoordinator && (
              <React.Fragment>
                <button className="info-card-edit-btn" onClick={() => setShowModal(ModalStates.META_EDIT)}>
                  <PencilIcon width="1em" height="1em" /> Edit
                </button>
                {showModal === ModalStates.META_EDIT && (
                  <MetaEditModal
                    sectionId={id}
                    closeModal={closeModal}
                    reloadSection={reloadSection}
                    capacity={capacity}
                    description={""}
                  />
                )}
              </React.Fragment>
            )}
            <p>
              <span className="meta-field">Capacity:</span> {capacity}
            </p>
            <p>
              <span className="meta-field">Labels:</span> {labelSet.map(label => label.name).join(", ")}
            </p>
          </InfoCard>
        </div>
      </div>
    </React.Fragment>
  );
}
