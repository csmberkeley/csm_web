import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface ActionButtonProps {
  copyEmail: () => void;
  drop: () => void;
  reset: () => void;
}

export default function ActionButton({ copyEmail, drop, reset }: ActionButtonProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isStudents = pathname.includes("students");
  function changeURL() {
    const newPath = isStudents ? pathname.replace("students", "mentors") : pathname.replace("mentors", "students");
    reset();
    navigate(newPath);
  }
  return (
    <div className="actionButtons">
      <button onClick={copyEmail}>
        <div id="default-copy">Copy Email</div>
        <div id="success-copy" className="hidden">
          <div className="checkmark"></div>

          <div>Copied!</div>
        </div>
      </button>
      <button onClick={drop}>
        <div>Drop</div>
      </button>
      {isStudents ? (
        <button onClick={changeURL}>
          <div>Mentors</div>
        </button>
      ) : (
        <button onClick={changeURL}>
          <div>Students</div>
        </button>
      )}
    </div>
  );
}
