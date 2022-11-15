import React, { useState } from "react";
import { useSectionStudents } from "../../utils/queries/sections";
import { Mentor, Spacetime, Student } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import { CoordinatorAddStudentModal } from "./CoordinatorAddStudentModal";
import MetaEditModal from "./MetaEditModal";
import { InfoCard, SectionSpacetime } from "./Section";
import SpacetimeEditModal from "./SpacetimeEditModal";
import StudentDropper from "./StudentDropper";

import XIcon from "../../../static/frontend/img/x.svg";
import PencilIcon from "../../../static/frontend/img/pencil.svg";
import SpacetimeDeleteModal from "./SpacetimeDeleteModal";

enum ModalStates {
  NONE = "NONE",
  SPACETIME_EDIT = "SPACETIME_EDIT",
  META_EDIT = "META_EDIT",
  SPACETIME_DELETE = "SPACETIME_DELETE"
}

interface MentorSectionInfoProps {
  spacetimes: Spacetime[];
  isCoordinator: boolean;
  mentor: Mentor;
  capacity: number;
  description: string;
  id: number;
}

export default function MentorSectionInfo({
  spacetimes,
  isCoordinator,
  mentor,
  capacity,
  id: sectionId,
  description
}: MentorSectionInfoProps) {
  const { data: students, isSuccess: studentsLoaded, isError: studentsLoadError } = useSectionStudents(sectionId);

  const [showModal, setShowModal] = useState(ModalStates.NONE);
  const [focusedSpacetimeID, setFocusedSpacetimeID] = useState<number>(-1);
  const [isAddingStudent, setIsAddingStudent] = useState<boolean>(false);
  const [deleteType, setDeleteType] = useState<boolean>(false);

  const closeModal = () => setShowModal(ModalStates.NONE);

  const closeAddModal = () => {
    setIsAddingStudent(false);
  };

  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">{`${
        isCoordinator ? `${mentor.name || mentor.email}'s` : "My"
      } Section`}</h3>
      <div className="section-info-cards-container">
        <InfoCard title="Students">
          {studentsLoaded ? (
            // done loading
            <React.Fragment>
              <table id="students-table">
                <thead>
                  <tr>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {(students.length === 0 ? [{ name: "No students enrolled", email: "", id: -1 }] : students).map(
                    ({ name, email, id: studentId }: Student) => (
                      <tr key={studentId}>
                        <td>
                          {isCoordinator && studentId !== -1 && (
                            <StudentDropper name={name ? name : email} id={studentId} sectionId={sectionId} />
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
                <CoordinatorAddStudentModal closeModal={closeAddModal} sectionId={sectionId} />
              )}
            </React.Fragment>
          ) : studentsLoadError ? (
            // error loading
            <h3>Students could not be loaded</h3>
          ) : (
            // not done loading
            <LoadingSpinner className="spinner-centered" />
          )}
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
                  sectionId={sectionId}
                  defaultSpacetime={spacetime}
                  closeModal={closeModal}
                  editingOverride={deleteType}
                />
              )}
              {showModal === ModalStates.SPACETIME_DELETE && focusedSpacetimeID === spacetime.id && (
                <SpacetimeDeleteModal
                  sectionId={sectionId}
                  spacetimeId={spacetime.id}
                  closeModal={closeModal}
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
                    sectionId={sectionId}
                    closeModal={closeModal}
                    capacity={capacity}
                    description={description}
                  />
                )}
              </React.Fragment>
            )}
            <p>
              <span className="meta-field">Capacity:</span> {capacity}
            </p>
            <p>
              <span className="meta-field">Description:</span> {description}
            </p>
          </InfoCard>
        </div>
      </div>
    </React.Fragment>
  );
}
