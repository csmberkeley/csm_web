import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { Label } from "../../utils/types";
import Pencil from "../../../static/frontend/img/pencil.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";
import Toggle from "react-toggle";

interface ManageLabelsModalProps {
  closeModal: () => void;
  courseId: number;
  reloadSections: () => void;
  title: string | boolean;
}

/**
 * Modal that coords use to export a csv of student emails in selected courses.
 */
export const ManageLabelsModal = ({
  closeModal,
  courseId,
  reloadSections,
  title
}: ManageLabelsModalProps): React.ReactElement => {
  /**
   * Map of course id to course name.
   */
  const [courseLabels, setCourseLabels] = useState([]);

  // fetch all labels upon first mount
  useEffect(() => {
    fetchJSON(`/courses/${courseId}/labels`).then(data => {
      setCourseLabels(data);
    });
  }, []);

  return (
    <Modal closeModal={closeModal}>
      <div className="data-export-modal">
        <div className="data-export-modal-header">List of labels for {title}</div>
        <ul>
          {courseLabels.map((label: Label) => (
            <li key={label.id}>
              {label.name}: {label.description}
              <label>
                <Toggle id={label.name} defaultChecked={label.showPopup} />
              </label>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};
