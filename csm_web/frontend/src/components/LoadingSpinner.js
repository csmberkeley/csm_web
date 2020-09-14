import React from "react";
import PropTypes from "prop-types";

export default function LoadingSpinner({ id }) {
  return (
    <div className="sk-fading-circle" id={id}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className={`sk-circle${i + 1} sk-circle`} />
      ))}
    </div>
  );
}

LoadingSpinner.propTypes = { id: PropTypes.string };
