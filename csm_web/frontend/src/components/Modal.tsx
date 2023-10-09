import React, { createContext, useContext } from "react";

import XIcon from "../../static/frontend/img/x.svg";

const ModalContext = createContext(Function.prototype);

interface ModalProps {
  children: React.ReactNode;
  closeModal: React.MouseEventHandler<Element>;
  className?: string;
}

interface ModalCloserProps {
  children: React.ReactNode;
}

export default function Modal({ children, closeModal, className = "" }: ModalProps): React.ReactElement {
  return (
    <ModalContext.Provider value={closeModal}>
      <div className="modal-overlay" onClick={closeModal} />
      <div className={`modal `}>
        <div className="modal-close-container">
          <button className="modal-close-x" aria-label="close" onClick={closeModal}>
            <XIcon className="icon" />
          </button>
        </div>
        <div className={`modal-contents ${className}`}>{children}</div>
      </div>
    </ModalContext.Provider>
  );
}

export function ModalCloser({ children }: ModalCloserProps): React.ReactElement {
  const closeModal = useContext(ModalContext) as React.MouseEventHandler<Element>;
  return (
    <div onClick={closeModal} className="modal-close">
      {children}
    </div>
  );
}
