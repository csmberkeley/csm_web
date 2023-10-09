import React, { useState } from "react";

import { useSectionUpdateMutation } from "../../utils/queries/sections";
import Modal from "../Modal";

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

  const sectionUpdateMutation = useSectionUpdateMutation(sectionId);

  function handleChange({ target: { name, value } }: React.ChangeEvent<HTMLInputElement>) {
    setFormState(prevFormState => ({ ...prevFormState, [name]: value }));
  }

  function handleSubmit(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    //TODO: Handle API Failure
    sectionUpdateMutation.mutate(formState);
    closeModal();
  }

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
          <button className="primary-btn" onClick={handleSubmit}>
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
