import React, { useEffect, useState } from "react";

import { useSectionUpdateMutation } from "../../utils/queries/sections";
import Modal from "../Modal";

import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";

interface MetaEditModalProps {
  sectionId: number;
  closeModal: () => void;
  capacity: number;
  description: string;
}

export default function MetaEditModal({
  closeModal,
  sectionId,
  capacity,
  description
}: MetaEditModalProps): React.ReactElement {
  // use existing capacity and description as initial values
  const [formState, setFormState] = useState({ capacity: capacity, description: description });
  const [validationText, setValidationText] = useState("");

  const sectionUpdateMutation = useSectionUpdateMutation(sectionId);

  useEffect(() => {
    if (validationText !== "") {
      validateForm();
    }
  });

  const handleChange = ({ target: { name, value } }: React.ChangeEvent<HTMLInputElement>) => {
    setFormState(prevFormState => ({ ...prevFormState, [name]: value }));
  };

  const validateForm = () => {
    if (isNaN(formState.capacity) || formState.capacity < 0) {
      setValidationText("Capacity must be non-negative");
      return false;
    }

    setValidationText("");
    return true;
  };

  const handleSubmit = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      // don't do anything if invalid
      return;
    }

    sectionUpdateMutation.mutate(formState, {
      onSuccess: closeModal,
      onError: () => {
        setValidationText("Error occurred on save");
      }
    });
  };

  return (
    <Modal closeModal={closeModal}>
      <div className="csm-form">
        <h2>Change Section Metadata</h2>
        <label className="form-label">
          Capacity
          <input
            className="form-input"
            required
            name="capacity"
            type="number"
            min="0"
            inputMode="numeric"
            pattern="[0-9]*"
            value={formState.capacity}
            onChange={handleChange}
            autoFocus
          />
        </label>
        <label className="form-label">
          Description
          <input
            className="form-input"
            name="description"
            type="text"
            value={formState.description}
            onChange={handleChange}
          />
        </label>
        <div className="form-actions">
          {validationText !== "" && (
            <div className="spacetime-edit-form-validation-container">
              <ExclamationCircle className="icon" />
              <span className="spacetime-edit-form-validation-text">{validationText}</span>
            </div>
          )}
          <button className="primary-btn" onClick={handleSubmit}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
