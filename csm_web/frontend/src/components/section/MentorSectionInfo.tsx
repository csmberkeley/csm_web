import React, { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useSectionStudents, useDropSectionMutation } from "../../utils/queries/sections";
import { Mentor, Spacetime, Student, Course } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import { CoordinatorAddStudentModal } from "./CoordinatorAddStudentModal";
import MetaEditModal from "./MetaEditModal";
import { InfoCard, SectionSpacetime } from "./Section";
import SpacetimeEditModal from "./SpacetimeEditModal";
import StudentDropper from "./StudentDropper";
import SpacetimeDeleteModal from "./SpacetimeDeleteModal";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";

import { useProfiles, useUserInfo } from "../../utils/queries/base";
import { useCourses } from "../../utils/queries/courses";

import Modal from "../Modal";

import { useMutation, UseMutationResult, useQuery, useQueryClient, UseQueryResult } from "@tanstack/react-query";
import {
  handleError,
  handlePermissionsError,
  handleRetry,
  PermissionError,
  ServerError
} from "./../../utils/queries/helpers";

// Images
import XIcon from "../../../static/frontend/img/x.svg";
import PencilIcon from "../../../static/frontend/img/pencil.svg";

// Styles
import "../../css/coordinator-add-student.scss";
import { NavLink } from "react-router-dom";

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
  courseRestricted: boolean;
}

export default function MentorSectionInfo({
  spacetimes,
  isCoordinator,
  mentor,
  capacity,
  id: sectionId,
  description,
  courseRestricted
}: MentorSectionInfoProps) {
  const { data: students, isSuccess: studentsLoaded, isError: studentsLoadError } = useSectionStudents(sectionId);

  const { data: courses, isSuccess: coursesLoaded, isError: coursesLoadError } = useCourses();

  const [showModal, setShowModal] = useState(ModalStates.NONE);
  const [focusedSpacetimeID, setFocusedSpacetimeID] = useState<number>(-1);
  const [isAddingStudent, setIsAddingStudent] = useState<boolean>(false);
  const [deleteType, setDeleteType] = useState<boolean>(false);

  let courseIds = [];

  const closeModal = () => setShowModal(ModalStates.NONE);

  const closeAddModal = () => {
    setIsAddingStudent(false);
  };

  if (coursesLoaded) {
    const coursesById: Map<number, Course> = new Map();
    for (const courseObj of courses) {
      coursesById.set(courseObj.id, courseObj);
    }

    let courseIds = Array.from(coursesById.keys());
    // console.log(courseIds)
  }

  return (
    <React.Fragment>
      <h3 className="section-detail-page-title">{`${
        isCoordinator ? `${mentor.name || mentor.email}'s` : "My"
      } Section`}</h3>
      <div className="section-info-cards-container">
        <InfoCard
          title="Students"
          extraPadding={
            // add extra padding if loading, otherwise remove padding
            !studentsLoaded
          }
        >
          {studentsLoaded ? (
            // done loading
            <React.Fragment>
              <table id="students-table" className="csm-table">
                <thead className="csm-table-head">
                  <tr className="csm-table-head-row">
                    <th className="csm-table-item">Name</th>
                  </tr>
                </thead>
                <tbody>
                  {(students.length === 0 ? [{ name: "No students enrolled", email: "", id: -1 }] : students).map(
                    ({ name, email, id: studentId }: Student) => (
                      <tr key={studentId} className="csm-table-row">
                        <td className="csm-table-item">
                          {isCoordinator && studentId !== -1 && (
                            <StudentDropper
                              name={name ? name : email}
                              id={studentId}
                              sectionId={sectionId}
                              courseRestricted={courseRestricted}
                            />
                          )}
                          <span className="student-info">{name || email}</span>
                        </td>
                      </tr>
                    )
                  )}
                  {isCoordinator && (
                    <React.Fragment>
                      <tr className="csm-table-row">
                        <td className="csm-table-item">
                          <button className="secondary-btn" onClick={() => setIsAddingStudent(true)}>
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
              spacetimeActions={
                <div className="info-card-actions">
                  {spacetimes.length > 1 && isCoordinator ? (
                    <button
                      className="secondary-link-btn delete-spacetime-btn"
                      onClick={() => {
                        setShowModal(ModalStates.SPACETIME_DELETE);
                        setFocusedSpacetimeID(spacetime.id);
                        setDeleteType(false);
                      }}
                    >
                      <XIcon className="icon" /> Delete
                    </button>
                  ) : (
                    <div>{/* empty div for positioning */}</div>
                  )}
                  <button
                    className="secondary-link-btn info-card-edit-btn"
                    onClick={() => {
                      setShowModal(ModalStates.SPACETIME_EDIT);
                      setFocusedSpacetimeID(spacetime.id);
                      setDeleteType(false);
                    }}
                  >
                    <PencilIcon className="icon" /> Edit
                  </button>
                </div>
              }
              overrideActions={
                <div className="info-card-actions">
                  <button
                    className="secondary-link-btn delete-spacetime-btn"
                    onClick={() => {
                      setShowModal(ModalStates.SPACETIME_DELETE);
                      setFocusedSpacetimeID(spacetime.id);
                      setDeleteType(true);
                    }}
                  >
                    <XIcon className="icon" /> Delete
                  </button>
                  <button
                    className="secondary-link-btn info-card-edit-btn"
                    onClick={() => {
                      setShowModal(ModalStates.SPACETIME_EDIT);
                      setFocusedSpacetimeID(spacetime.id);
                      setDeleteType(true);
                    }}
                  >
                    <PencilIcon className="icon" /> Edit
                  </button>
                </div>
              }
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
            </SectionSpacetime>
          ))}

          <InfoCard title="Meta">
            {isCoordinator && (
              <React.Fragment>
                <div className="info-card-actions">
                  <div>{/* empty div for positioning */}</div>
                  <button
                    className="secondary-link-btn info-card-edit-btn"
                    onClick={() => setShowModal(ModalStates.META_EDIT)}
                  >
                    <PencilIcon className="icon" /> Edit
                  </button>
                </div>
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
      <DropSection sectionId={sectionId} courseIds={courseIds} />
    </React.Fragment>
  );
}

interface DropSectionProps {
  sectionId: number;
  courseIds: Array<number>;
}

enum DropSectionStage {
  INITIAL = "INITIAL",
  CONFIRM = "CONFIRM",
  DROPPED = "DROPPED"
}

function DropSection({ sectionId, courseIds }: DropSectionProps) {
  const sectionDropMutation = useDropSectionMutation(sectionId, courseIds);
  const [stage, setStage] = useState<DropSectionStage>(DropSectionStage.INITIAL);

  const performDrop = () => {
    sectionDropMutation.mutate(undefined, {
      onSuccess: () => {
        // console.log(sectionId)
        setStage(DropSectionStage.DROPPED);
      }
    });
  };

  switch (stage) {
    case DropSectionStage.INITIAL:
      return (
        <InfoCard title="Drop Section" showTitle={false}>
          <h5>Drop Section</h5>
          <button className="danger-btn" onClick={() => setStage(DropSectionStage.CONFIRM)}>
            <XIcon className="icon" />
            Drop
          </button>
        </InfoCard>
      );
    case DropSectionStage.CONFIRM:
      return (
        <Modal closeModal={() => setStage(DropSectionStage.INITIAL)}>
          <div className="drop-confirmation">
            <h5>Are you sure you want to drop?</h5>
            <p>You are not guaranteed an available spot in another section!</p>
            <button className="danger-btn" onClick={performDrop}>
              Confirm
            </button>
          </div>
        </Modal>
      );
    case DropSectionStage.DROPPED:
      return <Navigate to="/" />;
  }
}
