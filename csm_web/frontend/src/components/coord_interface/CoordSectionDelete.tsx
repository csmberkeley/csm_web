import React, { useState } from "react";

import { useCoordDeleteSectionMutation } from "../../utils/queries/coord";
// import Modal from "../Modal";
import XIcon from "../../../static/frontend/img/x.svg";

// import "../../css/student_dropper.scss";

interface CoordSectionDeleteProps {
  sectionId: number;
}

export default function CoordSectionDelete({ sectionId }: CoordSectionDeleteProps) {
  const [showDropPrompt, setShowDropPrompt] = useState(false);
  const [drop, setDrop] = useState(false);
  const [ban, setBan] = useState(false);
  const [blacklist, setBlacklist] = useState(false);

  /**
   * Mutation to drop a student from the section. (Inspiration taken from dropping students within sections)
   */
  const coordSectionDeleteMutation = useCoordDeleteSectionMutation(sectionId);

  function handleClickDrop() {
    coordSectionDeleteMutation.mutate({ banned: ban, blacklisted: blacklist });
    setShowDropPrompt(false);
  }

  const dropDiv = (
    <div>
      <h2 className="student-dropper-head-item">DROP Student</h2>
      <div className="student-dropper-checkbox-container">
        <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
        <label className="student-dropper-checkbox-label" htmlFor="drop">
          I would like to DELETE the section: {sectionId}.
        </label>
        <br></br>
      </div>
    </div>
  );

  return (
    //   <span className={`student-dropper ${showDropPrompt ? "ban-prompt-visible" : ""}`}>
    //     <XIcon
    //       className="icon inline-plus-sign"
    //       title="Drop student from section"
    //       onClick={() => setShowDropPrompt(true)}
    //     />
    //     <div>dropDiv</div>
    <button className="danger-btn" onClick={handleClickDrop} disabled={!drop}>
      Submit
    </button>
    //   </span>
  );
}
