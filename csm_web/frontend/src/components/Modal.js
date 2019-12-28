import React from "react";
import PropTypes from "prop-types";

export default function Modal({ children, closeModal }) {
  if (!(children instanceof Array)) {
    children = [children];
  }
  return (
    <React.Fragment>
      <div className="modal-overlay" onClick={closeModal} />
      <div className="modal">
        <div className="modal-contents">
          {children.map((child, i) =>
            Object.prototype.hasOwnProperty.call(child.props, "modalClose") ? (
              <div key={i} className="modal-close" onClick={closeModal}>
                {child}
              </div>
            ) : (
              child
            )
          )}
        </div>
      </div>
    </React.Fragment>
  );
}

Modal.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]).isRequired,
  closeModal: PropTypes.func.isRequired
};
