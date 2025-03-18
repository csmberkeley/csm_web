import React, { useState } from "react";

import { useDropStudentMutation, useDropWaitlistMutation } from "../../utils/queries/sections";
import Modal from "../Modal";

import XIcon from "../../../static/frontend/img/x.svg";

import "../../css/student_dropper.scss";

interface StudentDropperProps {
  id: number;
  sectionId: number;
  name: string;
  courseRestricted: boolean;
  isWaitlist: boolean;
}

export default function StudentDropper({ id, sectionId, name, courseRestricted, isWaitlist }: StudentDropperProps) {
  const [showDropPrompt, setShowDropPrompt] = useState(false);
  const [drop, setDrop] = useState(false);
  const [waitlistDrop, setWaitlistDrop] = useState(false);
  const [ban, setBan] = useState(false);
  const [blacklist, setBlacklist] = useState(false);

  /**
   * Mutation to drop a student from the section.
   */
  const studentDropMutation = useDropStudentMutation(id, sectionId);
  const waitlistDropMutation = useDropWaitlistMutation(id, sectionId);

  function handleClickDrop() {
    if (waitlistDrop) {
      waitlistDropMutation.mutate({ banned: ban, blacklisted: blacklist });
    } else {
      studentDropMutation.mutate({ banned: ban, blacklisted: blacklist });
    }
    setShowDropPrompt(false);
  }

  /*
Warning: Dropping a student automatically processes the waitlist.
Do you want to drop and add a student
Add student, decrease capacity, drop student
  */

  const dropDiv = (
    <div>
      <h2 className="student-dropper-head-item">DROP Student</h2>
      <div className="student-dropper-checkbox-container">
        <input type="checkbox" id="drop" name="drop" onChange={e => setDrop(e.target.checked)} />
        <label className="student-dropper-checkbox-label" htmlFor="drop">
          I would like to DROP {name} from this section.
        </label>
        <br></br>
      </div>
    </div>
  );

  const waitlistDropDiv = (
    <div>
      <h2 className="student-dropper-head-item">DROP Waitlisted Student</h2>
      <div className="student-dropper-checkbox-container">
        <input type="checkbox" id="drop" name="drop" onChange={e => setWaitlistDrop(e.target.checked)} />
        <label className="student-dropper-checkbox-label" htmlFor="drop">
          I would like to DROP {name} from this waitlist section.
        </label>
        <br></br>
      </div>
    </div>
  );

  const banDiv = (
    <div>
      <h2 className="student-dropper-head-item">BAN Student</h2>
      <div className="student-dropper-checkbox-container">
        <input type="checkbox" id="ban" name="ban" onChange={e => setBan(e.target.checked)} disabled={!drop} />
        <label className="student-dropper-checkbox-label" htmlFor="ban">
          I would like to BAN {name} from this course.
        </label>
        <br></br>
      </div>
    </div>
  );

  const blacklistDiv = (
    <div>
      <h2 className="student-dropper-head-item">BLACKLIST Student</h2>
      <div className="student-dropper-checkbox-container">
        <input
          type="checkbox"
          id="blacklist"
          name="blacklist"
          onChange={e => setBlacklist(e.target.checked)}
          disabled={!drop}
        />
        <label className="student-dropper-checkbox-label" htmlFor="blacklist">
          I would like to BLACKLIST {name} from this course.
        </label>
        <br></br>
      </div>
    </div>
  );

  return (
    <span className={`student-dropper ${showDropPrompt ? "ban-prompt-visible" : ""}`}>
      <XIcon
        className="icon inline-plus-sign"
        title="Drop student from section"
        onClick={() => setShowDropPrompt(true)}
      />
      {showDropPrompt && (
        <Modal className="student-dropper-modal" closeModal={() => setShowDropPrompt(false)}>
          {isWaitlist ? waitlistDropDiv : dropDiv}
          {courseRestricted ? blacklistDiv : banDiv}
          <p>
            <span className="warning">WARNING: </span>Dropping a student automatically processes the waitlist.
          </p>
          <div className="student-dropper-submit-wrapper">
            <button className="danger-btn" onClick={handleClickDrop} disabled={!drop}>
              Submit
            </button>
          </div>
        </Modal>
      )}
    </span>
  );
}
