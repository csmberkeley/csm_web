import React, { useContext } from "react";
import PropTypes from "prop-types";

const ModalContext = React.createContext(Function.prototype);

export default function Modal({ children, closeModal, className = "" }) {
  return (
    <ModalContext.Provider value={closeModal}>
      <div className="modal-overlay" onClick={closeModal} />
      <div className={`modal ${className}`}>
        <div className="modal-contents">
          <div className="modal-close-x">
            <button className="inline-plus-sign" onClick={closeModal}>
              <span>+</span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
}

Modal.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]).isRequired,
  closeModal: PropTypes.func.isRequired,
  className: PropTypes.string
};

export function ModalCloser({ children }) {
  const closeModal = useContext(ModalContext);
  return (
    <div onClick={closeModal} className="modal-close">
      {children}
    </div>
  );
}

ModalCloser.propTypes = {
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]).isRequired
};
