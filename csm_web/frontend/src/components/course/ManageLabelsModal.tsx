import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { Label, Course } from "../../utils/types";
import Pencil from "../../../static/frontend/img/pencil.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";
import Exit from "../../../static/frontend/img/check_circle.svg";

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

  const [currCourseLabels, setCurrCourseLabels] = useState<Label[]>([]);

  const [newLabelKey, setNewLabelKey] = useState(-1);

  const [course, setCourse] = useState<Course>();

  // fetch all labels upon first mount
  useEffect(() => {
    fetchJSON(`/courses/`).then(data => {
      const course = data.find((c: Course) => c.id === courseId);
      setCourse(course);
    });
    fetchJSON(`/courses/${courseId}/labels`).then(data => {
      setCourseLabels(data.sort((a: Label, b: Label) => a.id - b.id));
      setCurrCourseLabels(data.sort((a: Label, b: Label) => a.id - b.id));
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
    let newLabels = [...tempLabels, newLabel];
    const positiveLabelsSorted = newLabels.filter((label: Label) => label.id >= 0).sort((a, b) => a.id - b.id);
    const negativeLabelsSorted = newLabels.filter((label: Label) => label.id < 0).sort((a, b) => b.id - a.id);
    newLabels = [...positiveLabelsSorted, ...negativeLabelsSorted];
    setCourseLabels(newLabels);
  };

  const handleNewRow = () => {
    if (course !== undefined) {
      setCourseLabels([
        ...courseLabels,
        { id: newLabelKey, course: course, sections: [], name: "", description: "", showPopup: false }
      ]);
      setNewLabelKey(newLabelKey - 1);
    }
  };

  function handleSubmit(event: React.ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    const currIDs = courseLabels.map((label: Label) => label.id);
    const prevIDs = currCourseLabels.map((label: Label) => label.id);
    const deletedIDs = [];
    for (const id of prevIDs) {
      if (!currIDs.includes(id)) {
        deletedIDs.push(id);
      }
    }
    const putValue = {
      labels: courseLabels,
      deletedLabelIds: deletedIDs
    };
    fetchWithMethod(`/courses/${courseId}/labels`, HTTP_METHODS.PUT, putValue).then(() => {
      closeModal();
      reloadSections();
    });
  }

  return (
    <Modal closeModal={closeModal}>
      <form className="manage-labels-form" onSubmit={handleSubmit}>
        <div>
          <div className="manage-labels-form-header">Labels for {title}</div>
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
          <div className="manage-label-modal-buttons">
            <input className="label-btn" type="button" onClick={handleNewRow} value="Add New Label" />
            <input className="label-btn" type="submit" value="Save Labels" />
          </div>
        </div>
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

  function handleCheck(e: any) {
    editValue("showpopup", e.target.checked);
  }

  return (
    <div>
      {/* // if not editing labels.. */}
      {!editingLabels && (
        // begining of evenly spaced row
        <div className="manage-labels-modal-row">
          <div className="manage-labels-modal-col large-col">
            {label.name === "" && <div>Name of label</div>}
            {label.name !== "" && <div>{label.name}</div>}
          </div>
          <div className="manage-labels-modal-col large-col">
            {label.description === "" && <div>Description of label</div>}
            {label.description !== "" && <div>{label.description}</div>}
          </div>
          <div className="manage-labels-modal-col small-col">
            <input type="checkbox" defaultChecked={label.showPopup} onChange={handleCheck} disabled={true} />
          </div>
          <div className="manage-labels-modal-col small-col">
            <Pencil className="icon matcher-assignment-section-times-edit-icon" onClick={toggleEditingLabels} />
            <Trash className="icon matcher-assignment-section-times-edit-icon" onClick={removeLabel} />
          </div>
        </div>
        // end of evenly spaced row
      )}
      {/* // if editing labels... */}
      {editingLabels && (
        <div>
          <span className="manage-labels-modal-row">
            <div className="manage-labels-modal-col large-col">
              <input
                name="name"
                defaultValue={label.name}
                placeholder={label.name === "" ? "Name of label" : label.name}
                onChange={handleChange}
              />
            </div>
            <div className="manage-labels-modal-col large-col">
              <input
                name="description"
                defaultValue={label.description}
                placeholder={label.description === "" ? "Description of label" : label.description}
                onChange={handleChange}
              />
            </div>
            <div className="manage-labels-modal-col small-col">
              <input type="checkbox" defaultChecked={label.showPopup} onChange={handleCheck} />
            </div>
            <div className="manage-labels-modal-col small-col">
              <Exit className="icon matcher-assignment-section-times-edit-icon" onClick={toggleEditingLabels} />
            </div>
          </span>
        </div>
      )}
    </div>
  );
};
