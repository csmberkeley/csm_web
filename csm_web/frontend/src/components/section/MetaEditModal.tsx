import React, { useState } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import Modal from "../Modal";
import { Label } from "../../utils/types";
import Chip from "@mui/material/Chip";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

interface MetaEditModalProps {
  sectionId: number;
  closeModal: () => void;
  reloadSection: () => void;
  capacity: number;
  description: string;
  sectionLabels?: Label[];
}

export default function MetaEditModal({
  closeModal,
  sectionId,
  reloadSection,
  capacity,
  description,
  sectionLabels
}: MetaEditModalProps) {
  // use existing capacity and description as initial values
  const [formState, setFormState] = useState({ capacity: capacity, description: description });

  function handleChange({ target: { name, value } }: React.ChangeEvent<HTMLInputElement>) {
    setFormState(prevFormState => ({ ...prevFormState, [name]: value }));
  }

  function handleSubmit(event: React.ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    //TODO: Handle API Failure
    fetchWithMethod(`/sections/${sectionId}/`, HTTP_METHODS.PATCH, formState).then(() => {
      closeModal();
      reloadSection();
    });
  }

  return (
    <Modal closeModal={closeModal}>
      <form className="csm-form" onSubmit={handleSubmit}>
        <h4>Change Section Metadata</h4>
        <label>
          Capacity
          <input
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
        <label>
          Labels
          <input name="description" type="text" value={formState.description} onChange={handleChange} />
        </label>
        <input type="submit" value="Save" />
      </form>
    </Modal>
  );
}
