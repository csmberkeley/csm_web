import React, { useState } from "react";
import { useSpacetimeDeleteMutation, useSpacetimeOverrideDeleteMutation } from "../../utils/queries/spacetime";
import Modal from "../Modal";

// Styles
import "../../css/spacetime_delete.scss";

interface SpacetimeDeleteProps {
  spacetimeId: number;
  sectionId: number;
  overrideDelete: boolean;
  closeModal: () => void;
}

export default function SpacetimeDeleteModal({
  closeModal,
  spacetimeId,
  sectionId,
  overrideDelete
}: SpacetimeDeleteProps) {
  const [drop, setDrop] = useState(false);

  const spacetimeDeleteMutation = useSpacetimeDeleteMutation(sectionId, spacetimeId);
  const spacetimeOverrideDeleteMutation = useSpacetimeOverrideDeleteMutation(sectionId, spacetimeId);

  function handleClickDrop() {
    if (overrideDelete) {
      spacetimeOverrideDeleteMutation.mutate();
    } else {
      spacetimeDeleteMutation.mutate();
    }
    closeModal();
  }

  return (
    <Modal closeModal={closeModal}>
      <div className="delete-spacetime">
        <h2>Delete {overrideDelete ? "Override" : "Spacetime"}</h2>
        <div>
          <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
          <label className="spacetime-checkbox-label" htmlFor="drop">
            I understand this {overrideDelete ? "override" : "spacetime"} will be permenantly deleted.
          </label>
        </div>
        <div className="spacetime-delete-dropper">
          <button className="danger-btn" disabled={!drop} onClick={handleClickDrop}>
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}
