import React, { useState } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Override, Section as SectionType, Spacetime } from "../../utils/types";
import Modal from "../Modal";

interface SpacetimeDeleteProps {
  spacetimeId: number;
  overrideDelete: boolean;
  closeModal: () => void;
  reloadSection: () => void;
}

export default function SpacetimeDeleteModal({
  closeModal,
  spacetimeId,
  reloadSection,
  overrideDelete
}: SpacetimeDeleteProps) {
  const [drop, setDrop] = useState(false);

  function handleClickDrop() {
    if (overrideDelete) {
      fetchWithMethod(`spacetimes/${spacetimeId}/override/`, HTTP_METHODS.DELETE).then(() => reloadSection());
    } else {
      fetchWithMethod(`spacetimes/${spacetimeId}/`, HTTP_METHODS.DELETE).then(() => reloadSection());
    }
  }

  return (
    <Modal closeModal={closeModal}>
      <div className="deleteSpacetime">
        <div>
          <h4>Delete {overrideDelete ? "Override" : "Spacetime"}</h4>
          <div>
            <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
            <label className="spacetimeCheckboxLabel" htmlFor="drop">
              I understand this {overrideDelete ? "override" : "spacetime"} will be permenantly deleted.
            </label>
          </div>
        </div>
        <div className="spacetimeDeleteDropper">
          <button className="spacetimeDeleteSubmit" disabled={!drop} onClick={handleClickDrop}>
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}
