import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDeleteSectionMutation } from "../../utils/queries/sections";
import Modal from "../Modal";
import TrashIcon from "../../../static/frontend/img/trash-alt.svg";

import "../../css/section_delete.scss";

interface CoordSectionDeleteProps {
  sectionId: number;
}

export default function CoordSectionDelete({ sectionId }: CoordSectionDeleteProps) {
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const deleteSectionMutation = useDeleteSectionMutation(sectionId);
  const navigate = useNavigate();

  function handleDelete() {
    deleteSectionMutation.mutate(undefined, {
      onSuccess: () => navigate(-1)
    });
  }

  return (
    <div className="section-delete">
      <button className="danger-btn" onClick={() => setShowDeletePrompt(true)}>
        <TrashIcon className="icon" aria-hidden="true" /> Delete section
      </button>
      {showDeletePrompt && (
        <Modal className="section-delete-modal" closeModal={() => setShowDeletePrompt(false)}>
          <h2>Delete section</h2>
          <p>This section will be hidden, but its enrollment and attendance history will be preserved.</p>
          <label className="section-delete-confirmation">
            <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />I
            understand and want to delete this section.
          </label>
          <button
            className="danger-btn"
            onClick={handleDelete}
            disabled={!confirmed || deleteSectionMutation.isLoading}
          >
            {deleteSectionMutation.isLoading ? "Deleting…" : "Delete"}
          </button>
        </Modal>
      )}
    </div>
  );
}
