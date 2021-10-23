import React, { useContext } from "react";

const ModalContext = React.createContext(Function.prototype);

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
      <div className={`modal ${className}`}>
        <div className="modal-contents">
          <div className="modal-close-x">
            <button className="inline-plus-sign" onClick={closeModal}>
              <span>×</span>
            </button>
          </div>
          {children}
        </div>
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
