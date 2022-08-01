import React, { useState } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import Modal from "../Modal";

interface SpacetimeDeleteProps {
  sectionId: number;
  closeModal: () => void;
  reloadSection: () => void;
}

export default function SpacetimeDeleteModal({ closeModal, sectionId, reloadSection }: SpacetimeDeleteProps) {
  const [drop, setDrop] = useState(false);

  function handleClickDrop() {
    fetchWithMethod(`spacetime/${sectionId}/`, HTTP_METHODS.DELETE, {}).then(() => reloadSection());
  }

  return (
    <Modal closeModal={closeModal}>
      <div className="deleteSection">
        <div className="deleteSectionHeader">DELETE SECTION</div>
        <div>
          <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
          <label className="studentDropperCheckboxLabel" htmlFor="drop">
            I understand that this is permanent
          </label>
          <br></br>
          <button
            className="studentDropperSubmit"
            id="dropper submit button"
            disabled={!drop}
            onClick={handleClickDrop}
          >
            Submit
          </button>
        </div>
      </div>
    </Modal>
  );
}
