import React, { useEffect, useState } from "react";
import { fetchJSON, normalizeEndpoint } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { Course as CourseType } from "../../utils/types";

interface DataExportModalProps {
  closeModal: () => void;
}

/**
 * Modal that coords use to export a csv of student emails in selected courses.
 */
export const DataExportModal = ({ closeModal }: DataExportModalProps): React.ReactElement => {
  /**
   * Map of course id to course name.
   */
  const [courseMap, setCourseMap] = useState<Map<number, string>>(new Map());
  /**
   * Whether course data has been loaded.
   */
  const [courseLoaded, setCourseLoaded] = useState<boolean>(false);
  /**
   * Map of course id to boolean (whether the course is checked)
   */
  const [courseChecks, setCourseChecks] = useState<Map<number, boolean>>(new Map());

  // fetch all courses and construct maps upon first mount
  useEffect(() => {
    fetchJSON("/courses").then((courses: CourseType[]) => {
      const coursesById = new Map<number, string>();
      const courseCheckbyId = new Map<number, boolean>();
      for (const course of courses) {
        coursesById.set(course.id, course.name);
        courseCheckbyId.set(course.id, false);
      }
      setCourseMap(coursesById);
      setCourseChecks(courseCheckbyId);
      setCourseLoaded(true);
    });
  }, []);

  /**
   * Download a csv of student emails in selected courses.
   */
  const getStudentEmails = (): void => {
    const courses = Array.from(courseChecks.keys())
      .filter(id => courseChecks.get(id))
      .join();
    if (!courses || courses.length === 0) {
      alert("select something to download");
      return;
    }
    window.open(normalizeEndpoint(`/courses/students/?ids=${courses}`));
  };

  /**
   * Update the course checks map when a checkbox is clicked.
   */
  const updateCourseChecks = (k: number, v: boolean): void => {
    setCourseChecks(new Map(courseChecks.set(k, v)));
  };

  /**
   * Render grid of checkboxes, one for each course.
   */
  const renderCheckGrid = (): React.ReactElement => {
    const checks = Array.from(courseMap.keys()).map(i => renderCheck(i));
    return <div className="data-export-checkbox-grid">{checks}</div>;
  };

  /**
   * Render a checkbox for the ith course.
   */
  const renderCheck = (i: number): React.ReactElement => {
    return (
      <div className="data-export-checkbox">
        <label>
          <input
            type="checkbox"
            checked={courseChecks.get(i)}
            onChange={() => {
              updateCourseChecks(i, !courseChecks.get(i));
            }}
          />
          <span>{courseMap.get(i)}</span>
        </label>
      </div>
    );
  };

  return (
    <Modal closeModal={closeModal}>
      <div className="data-export-modal">
        <div className="data-export-modal-header">Download csv of student emails in selected courses</div>
        <div className="data-export-modal-selection">
          {!courseLoaded ? <LoadingSpinner id="course-menu-loading-spinner" /> : renderCheckGrid()}
        </div>
        <div className="data-export-modal-download">
          <button className="csm-btn export-data-btn" onClick={getStudentEmails}>
            Download
          </button>
        </div>
      </div>
    </Modal>
  );
};
