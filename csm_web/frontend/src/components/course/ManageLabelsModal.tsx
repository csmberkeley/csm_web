import React, { useEffect, useState } from "react";
import { fetchJSON } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { Label } from "../../utils/types";
import Pencil from "../../../static/frontend/img/pencil.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";
import Exit from "../../../static/frontend/img/x.svg";
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

  const removeLabel = (id: number) => {
    const tempLabels = courseLabels.filter((label: Label) => label.id !== id);
    setCourseLabels(tempLabels);
  };
  /*
  return (
    <Modal closeModal={closeModal}>
      <div className="data-export-modal">
        <div className="data-export-modal-header">List of labels for {title}</div>
        <ul>
          {courseLabels.map((label: Label) => (
            <EditLabelRow
            label={label}
            onChangeRow={() => {}}
            removeLabel={removeLabel}
            />
            // <p> hi csm ppl</p> // HI CSM PPPPPPLLLLLLLLLL
          ))}
        </ul>
      </div>
    </Modal>
  ); */
};

interface EditLabelRowProps {
  label: Label;
  onChangeRow: () => void;
  removeLabel: (id: number) => void;
}

export const EditLabelRow = ({ label, onChangeRow, removeLabel }: EditLabelRowProps) => {
  const [editingLabels, setEditingLabels] = useState<boolean>(false);

  /*const handleChangeRow = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, attr: keyof EditLabelRow) => {
    onChangeRow(row.mentorId, attr, e.target.value);
  };*/

  const toggleEditingLabels = (e: React.MouseEvent<HTMLOrSVGElement, MouseEvent>) => {
    e.stopPropagation();
    setEditingLabels(!editingLabels);
  };

  return (
    <div>
      {!editingLabels && (
        <div className="matcher-assignment-section-times-edit">
          {label.name}: {label.description}
          <label>
            <Toggle id={label.name} defaultChecked={label.showPopup} disabled={true} />
          </label>
          <Pencil className="icon matcher-assignment-section-times-edit-icon" onClick={toggleEditingLabels} />
          <Trash className="icon matcher-assignment-section-times-edit-icon" onClick={removeLabel} />
        </div>
      )}
      {editingLabels && (
        <span>
          <input id="name" defaultValue={label.name} />
          <input id="description" defaultValue={label.description} />
          <Toggle id={label.name} defaultChecked={label.showPopup} />
          <Exit className="icon matcher-assignment-section-times-edit-icon" onClick={toggleEditingLabels} />
        </span>
      )}
    </div>
  );
};
