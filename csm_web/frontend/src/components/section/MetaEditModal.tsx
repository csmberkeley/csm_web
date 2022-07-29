import React, { useState, useEffect } from "react";
import { fetchWithMethod, HTTP_METHODS, fetchJSON } from "../../utils/api";
import Modal from "../Modal";
import { Label } from "../../utils/types";
import TextField from "@material-ui/core/TextField";
import Autocomplete, { AutocompleteChangeReason } from "@material-ui/lab/Autocomplete";
// use react-select

interface MetaEditModalProps {
  sectionId: number;
  closeModal: () => void;
  reloadSection: () => void;
  capacity: number;
  sectionLabels: Label[];
}

export default function MetaEditModal({
  closeModal,
  sectionId,
  reloadSection,
  capacity,
  sectionLabels
}: MetaEditModalProps) {
  // use existing capacity and labels as initial values
  const [formState, setFormState] = useState({ capacity: capacity, sectionLabels: sectionLabels });

  const [courseLabels, setCourseLabels] = useState<Label[]>([]);

  useEffect(() => {
    fetchJSON(`/courses/2/labels`).then(data => {
      setCourseLabels(data);
    });
  });

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
          <Autocomplete
            multiple
            id="tags-standard"
            options={courseLabels}
            getOptionLabel={option => option.name}
            defaultValue={sectionLabels}
            renderInput={params => <TextField {...params} variant="outlined" />}
          />
        </label>
        <input type="submit" value="Save" />
      </form>
    </Modal>
  );
}
