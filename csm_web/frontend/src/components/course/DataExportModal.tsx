import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { fetchJSON, normalizeEndpoint } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { Course as CourseType } from "../../utils/types";

interface DataExportModalProps {
  closeModal: () => void;
}

/**
 * @function DataExportModal
 * @component
 * @param {DataExportModalProps} props
 * @returns Modal that coords use to export a csv of student emails
 *          in selected courses.
 */
export function DataExportModal(props: DataExportModalProps) {
  // Need to move to parent if rerequest coursedata everytime
  /**
   * @state courseMap : map of course ID to course name
   */
  const [courseMap, setCourseMap] = useState<Map<number, string>>(new Map());
  /**
   * @state {boolean} courseLoaded : true if course data has been
   *        loaded
   */
  const [courseLoaded, setCourseLoaded] = useState<boolean>(false);
  /**
   * @state courseChecks : map of course id to boolean (if checkmarked)
   */
  const [courseChecks, setCourseChecks] = useState<Map<number, boolean>>(new Map());

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

  function getStudentEmails(): void {
    const courses = Array.from(courseChecks.keys())
      .filter(id => courseChecks.get(id))
      .join();
    if (!courses || courses.length === 0) {
      alert("select something to download");
      return;
    }
    window.open(normalizeEndpoint(`/courses/students/?ids=${courses}`));
  }

  const updateCourseChecks = (k: number, v: boolean): void => {
    setCourseChecks(new Map(courseChecks.set(k, v)));
  };

  function renderCheckGrid(): React.ReactElement {
    const checks = Array.from(courseMap.keys()).map(i => renderCheck(i));
    return <div className="data-export-checkbox-grid">{checks}</div>;
  }

  function renderCheck(i: number): React.ReactElement {
    return (
      <div className="data-export-checkbox">
        <label>
          <Checkbox
            checked={courseChecks.get(i)}
            onChange={() => {
              updateCourseChecks(i, !courseChecks.get(i));
            }}
          />
          <span>{courseMap.get(i)}</span>
        </label>
      </div>
    );
  }

  return (
    <Modal closeModal={props.closeModal}>
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
}

/**
 * @interface shape of DataExportModal.props
 *
 * @prop {function} closeModal : closes Modal
 */
DataExportModal.propTypes = {
  closeModal: PropTypes.func.isRequired
};
const Checkbox = (props: any) => <input type="checkbox" {...props} />;
