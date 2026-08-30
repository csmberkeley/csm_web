import React, { useState } from "react";

import { useCoordDropStudentMutation } from "../../utils/queries/coord";
// import Modal from "../Modal";
import XIcon from "../../../static/frontend/img/x.svg";

// import "../../css/student_dropper.scss";

interface CoordStudentDropperProps {
  // data: [];
  id: number;
  sectionId: number;
  name: string;
  courseRestricted: boolean;
}

// id, sectionId, name, courseRestricted old props
export default function CoordStudentDropper({ id, sectionId, name, courseRestricted }: CoordStudentDropperProps) {
  // need to find a way to change the selectedData into the format which we want for this
  // either make it so we take in a list and then decode it wtihin this component or do something
  const [showDropPrompt, setShowDropPrompt] = useState(false);
  const [drop, setDrop] = useState(false);
  const [ban, setBan] = useState(false);
  const [blacklist, setBlacklist] = useState(false);

  // make a bunch of lists which each of the indices corresponds to a student (if there are null/empty values just add null or undefined?)

  /**
   * Mutation to drop a student from the section. (Inspiration taken from dropping students within sections)
   */
  const coordStudentDropMutation = useCoordDropStudentMutation(id, sectionId); // might want to do like a forEach within this?

  function handleClickDrop() {
    coordStudentDropMutation.mutate({ banned: ban, blacklisted: blacklist });
    setShowDropPrompt(false);
  }

  // this is just copied over... please look over and change later?
  const dropDiv = (
    <div>
      <h2 className="student-dropper-head-item">DELETE Section</h2>
      <div className="student-dropper-checkbox-container">
        <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
        <label className="student-dropper-checkbox-label" htmlFor="drop">
          I would like to DROP {name} from this section.
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
