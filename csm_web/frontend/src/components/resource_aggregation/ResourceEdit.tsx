import React from "react";
import Modal, { ModalCloser } from "../Modal";
import { ResourceEditProps } from "./ResourceTypes";

export const ResourceEdit = ({ resource, onChange, onFileChange, onSubmit, onCancel }: ResourceEditProps) => {
  return (
    <Modal closeModal={onCancel}>
      <div className="resourceEditContainer">
        <div id="resourceEditInner">
          <div>
            <div className="resourceInfoEdit">
              <input type="text" defaultValue={resource.weekNum} onChange={e => onChange(e, "weekNum")} />
            </div>
            <div className="resourceInfoEdit">
              <input type="date" defaultValue={resource.date} onChange={e => onChange(e, "date")} />
            </div>
            <div className="resourceInfoEdit">
              <input type="text" defaultValue={resource.topics} onChange={e => onChange(e, "topics")} />
            </div>
            <div className="resourceInfoEdit">
              <input type="text" defaultValue={resource.worksheetName} onChange={e => onChange(e, "worksheetName")} />
            </div>
          </div>
          <div>
            <div className="resourceInfoEdit">
              <div>Worksheet File</div>
              <input className="fileUpload" type="file" onChange={e => onFileChange(e, "worksheetFile")} />
            </div>
            <div className="resourceInfoEdit">
              <div>Solutions File</div>
              <input className="fileUpload" type="file" onChange={e => onFileChange(e, "solutionFile")} />
            </div>
          </div>
        </div>
        <button onClick={onSubmit} id="resourceButtonSubmit">
          SUBMIT
        </button>
      </div>
    </Modal>

  );
  // TODO:add cancel button that discards changes and resets edit
};

export default ResourceEdit;
