import React, { useState, useEffect } from "react";
import { fetchWithMethod, HTTP_METHODS, fetchJSON } from "../../utils/api";
import Modal from "../Modal";
import { Label, Course } from "../../utils/types";
import Select, { ActionMeta, MultiValue } from "react-select";
import makeAnimated from "react-select/animated";

interface MetaEditModalProps {
  sectionId: number;
  closeModal: () => void;
  reloadSection: () => void;
  capacity: number;
  sectionLabels: Label[];
  course: string;
}

export default function MetaEditModal({
  closeModal,
  sectionId,
  reloadSection,
  capacity,
  sectionLabels,
  course
}: MetaEditModalProps) {
  // use existing capacity and labels as initial values
  const [courseLabels, setCourseLabels] = useState([]);

  const [selectedLabels, setSelectedLabels] = useState(
    sectionLabels.map(label => ({ label: label.name, value: label.id }))
  );

  const [formState, setFormState] = useState({ capacity: capacity, selectedLabels: selectedLabels });

  const [courseID, setCourseID] = useState();

  const animatedComponents = makeAnimated();

  useEffect(() => {
    fetchJSON(`/courses/`)
      .then(data => {
        const courseID = data.find((c: Course) => c.name === course).id;
        setCourseID(courseID);
        return fetchJSON(`/courses/${courseID}/labels`);
      })
      .then(data => {
        setCourseLabels(data.map((label: Label) => ({ label: label.name, value: label.id })));
      });
  }, []);

  function handleCapacityChange({ target: { name, value } }: React.ChangeEvent<HTMLInputElement>) {
    setFormState(prevFormState => ({ ...prevFormState, [name]: value }));
  }

  function handleSubmit(event: React.ChangeEvent<HTMLFormElement>) {
    event.preventDefault();
    //TODO: Handle API Failure
    fetchWithMethod(`/sections/${sectionId}`, HTTP_METHODS.PATCH, formState).then(() => {
      closeModal();
      reloadSection();
    });
  }

  const handleSelect = (newSelections: any) => {
    const labelIDs = newSelections.map((label: any) => label.value);
    setFormState(prevFormState => ({ ...prevFormState, selectedLabels: labelIDs }));
  };

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
            onChange={handleCapacityChange}
            autoFocus
          />
        </label>
        <label>
          Labels
          <Select
            options={courseLabels}
            isMulti
            placeholder="Select labels"
            closeMenuOnSelect={false}
            hideSelectedOptions={false}
            onChange={handleSelect}
            components={animatedComponents}
            defaultValue={selectedLabels}
          />
        </label>
        <input type="submit" value="Save" />
      </form>
    </Modal>
  );
}
