import React, { useState } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import Modal from "../Modal";

interface StudentDropperProps {
  id: number;
  name: string;
  reloadSection: () => void;
}

export default function StudentDropper({ id, name, reloadSection }: StudentDropperProps) {
  const [showDropPrompt, setShowDropPrompt] = useState(false);
  const [drop, setDrop] = useState(false);
  const [ban, setBan] = useState(false);

  function handleClickDrop() {
    fetchWithMethod(`students/${id}/drop`, HTTP_METHODS.PATCH, { banned: ban }).then(() => reloadSection());
  }

  return (
    <span className={`student-dropper ${showDropPrompt ? "ban-prompt-visible" : ""}`}>
      <span title="Drop student from section" className="inline-plus-sign" onClick={() => setShowDropPrompt(true)}>
        ×
      </span>
      {showDropPrompt && (
        <Modal closeModal={() => setShowDropPrompt(false)}>
          <div className="studentDropper">
            <div className="studentDropperHeadItem">DROP Student</div>
            <div>
              <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
              <label className="studentDropperCheckboxLabel" htmlFor="drop">
                I would like to DROP {name} from this section.
              </label>
              <br></br>
            </div>
            <div className="studentDropperHeadItem">BAN Student</div>
            <div>
              <input type="checkbox" id="ban" name="ban" onChange={e => setBan(e.target.checked)} disabled={!drop} />
              <label className="studentDropperCheckboxLabel" htmlFor="ban">
                I would like to BAN {name} from this course.
              </label>
              <br></br>
            </div>
            <div className="studentDropperSubmitWrapper">
              <button
                className="studentDropperSubmit"
                id="dropper submit button"
                onClick={handleClickDrop}
                disabled={!drop}
              >
                Submit
              </button>
            </div>
          </div>
        </Modal>
      )}
    </span>
  );
}
