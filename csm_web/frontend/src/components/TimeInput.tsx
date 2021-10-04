import React from "react";
import PropTypes from "prop-types";

function handleInvalid({ target }: React.ChangeEvent<HTMLInputElement>): void {
  if (target.type === "text") {
    // This is true if and only if the browser does not support HTML5's <input type="time">
    target.setCustomValidity("Please enter a valid time in 24-hour format (hh:mm) zero-padded");
  }
}

// A fully cross-browser compatible time input, providing a shim for browsers like Safari that don't have <input type="time">
export default function TimeInput({ onChange, ...props }: React.HTMLProps<HTMLInputElement>): JSX.Element {
  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.type === "text") {
      // This is true if and only if the browser does not support HTML5's <input type="time">
      // We need to clear this because otherwise the field will be permanently considered invalid even if its contents have changed
      event.target.setCustomValidity("");
    }
    onChange(event);
  }
  return (
    <input
      type="time"
      pattern="(2[0-3]|[0-1][0-9]):[0-5][0-9]"
      title="Please enter a valid time in 24-hour format (hh:mm) zero-padded"
      placeholder="hh:mm"
      onInvalid={handleInvalid}
      onChange={handleChange}
      {...props}
    />
  );
}

TimeInput.propTypes = { onChange: PropTypes.func.isRequired };
