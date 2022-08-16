import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { Label } from "../../utils/types";
import Pencil from "../../../static/frontend/img/pencil.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";
import Exit from "../../../static/frontend/img/check_circle.svg";
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
  const [courseLabels, setCourseLabels] = useState<Label[]>([]);

  const [newLabelKey, setNewLabelKey] = useState(-1);

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

  const editRow = (id: number, name: string, description: string, showPopup: boolean) => {
    const tempLabels = courseLabels.filter((label: Label) => label.id !== id);
    const oldLabel = courseLabels.find((label: Label) => label.id === id);
    const newLabel = { ...oldLabel, name: name, description: description, showPopup: showPopup } as Label;
    const newLabels = [...tempLabels, newLabel].sort((a, b) => a.id - b.id);
    setCourseLabels(newLabels);
  };

  const handleNewRow = () => {
    const course = courseLabels[0].course;
    setCourseLabels([
      ...courseLabels,
      { id: newLabelKey, course: course, sections: [], name: "", description: "", showPopup: false }
    ]);
    setNewLabelKey(newLabelKey - 1);
  };

  function handleSubmit(event: React.ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    fetchWithMethod(`/courses/${courseId}/labels`, HTTP_METHODS.PUT, courseLabels).then(() => {
      closeModal();
    });
  }

  return (
    <Modal closeModal={closeModal}>
      <form className="csm-form" onSubmit={handleSubmit}>
        <div className="data-export-modal">
          <div className="data-export-modal-header">List of labels for {title}</div>

          {/* // starting off by wrapping everything in a flexbox div with classname managelabelsmodal & playing around with that -Yahya  */}
          {/* this is the entire table for the flexbox */}
          <div className="manage-labels-modal">
            <ul>
              {courseLabels.map((label: Label) => (
                <EditLabelRow
                  key={label.id}
                  label={label}
                  onChangeRow={(name: string, description: string, showPopup: boolean) =>
                    editRow(label.id, name, description, showPopup)
                  }
                  removeLabel={() => removeLabel(label.id)}
                />
              ))}
            </ul>
          </div>
          {/* end manageLabelModals div */}

          <span onClick={handleNewRow}>Add a new label</span>
        </div>
        <input type="submit" value="Save" />
      </form>
    </Modal>
  );
};

interface EditLabelRowProps {
  label: Label;
  onChangeRow: (name: string, description: string, showPopup: boolean) => void;
  removeLabel: (id: number) => void;
}

export const EditLabelRow = ({ label, onChangeRow, removeLabel }: EditLabelRowProps) => {
  const [editingLabels, setEditingLabels] = useState<boolean>(false);

  const toggleEditingLabels = (e: React.MouseEvent<HTMLOrSVGElement, MouseEvent>) => {
    e.stopPropagation();
    setEditingLabels(!editingLabels);
  };

  const editValue = (type: string, value: any) => {
    if (type == "name") {
      onChangeRow(value, label.description, label.showPopup);
    } else if (type == "description") {
      onChangeRow(label.name, value, label.showPopup);
    } else if (type == "showpopup") {
      onChangeRow(label.name, label.description, value);
    } else {
      // should not get here
      console.error(`Unknown attribute ${type}`);
    }
  };

  function handleChange({ target: { name, value } }: React.ChangeEvent<HTMLInputElement>) {
    editValue(name, value);
  }

  return (
    <div>
      {/* // if not editing labels.. */}
      {!editingLabels && (
        // begining of evenly spaced row
        <div className="matcher-assignment-section-times-edit">
          {label.name === "" && <div>Name of label</div>}
          {label.name !== "" && <div>{label.name}</div>}
          {label.description === "" && <div>Description of label</div>}
          {label.description !== "" && <div>{label.description}</div>}
          <label>
            <Toggle id={label.name} defaultChecked={label.showPopup} disabled={true} />
          </label>
          <Pencil className="icon matcher-assignment-section-times-edit-icon" onClick={toggleEditingLabels} />
          <Trash className="icon matcher-assignment-section-times-edit-icon" onClick={removeLabel} />
        </div>
        // end of evenly spaced row
      )}
      {/* // if editing labels... */}
      {editingLabels && (
        <div>
          <span>
            <input
              name="name"
              defaultValue={label.name}
              placeholder={label.name === "" ? "Name of label" : label.name}
              onChange={handleChange}
            />
            <input
              name="description"
              defaultValue={label.description}
              placeholder={label.description === "" ? "Description of label" : label.description}
              onChange={handleChange}
            />
            <Toggle defaultChecked={label.showPopup} onChange={handleChange} />
            <Exit className="icon matcher-assignment-section-times-edit-icon" onClick={toggleEditingLabels} />
          </span>
        </div>
      )}
    </div>
  );
};

// 167 to 184 is editting labels div
// 137 to 163 is not edditing label

// columns
// name
// description
// checbox
// pencil / trash
