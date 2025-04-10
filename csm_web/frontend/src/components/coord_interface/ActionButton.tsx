import React from "react";

interface ActionButtonProps {
  copyEmail: () => void;
  drop: () => void;
}

export default function ActionButton({ copyEmail, drop }: ActionButtonProps) {
  return (
    <div className="actionButtons">
      <button onClick={copyEmail}>Copy Email</button>
      <button onClick={drop}>Drop</button>
    </div>
    //    <div className="copyEmailButton">
    //    <div className="copyEmailButtonText">

    //     </div>
    //     </div>
  );
}
