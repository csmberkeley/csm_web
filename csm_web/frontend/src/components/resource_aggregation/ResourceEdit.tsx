import React from "react";
import Modal, { ModalCloser } from "../Modal";
import { ResourceEditProps } from "./ResourceTypes";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faCheckCircle } from '@fortawesome/free-solid-svg-icons'

export const ResourceEdit = ({ resource, onChange, onFileChange, onSubmit, onCancel }: ResourceEditProps) => {
  return (
    <Modal closeModal={onCancel} className="resourceEditModal">
      <div className="resourceEditContainer">
        <div id="resourceEditInner">
          <div>
            <div className="resourceInfoEdit">
              <input type="text" defaultValue={resource.weekNum} placeholder="Week Number" onChange={e => onChange(e, "weekNum")} />
            </div>
            <div className="resourceInfoEdit">
              <input type="date" defaultValue={resource.date} onChange={e => onChange(e, "date")} />
            </div>
            <div className="resourceInfoEdit">
              <input type="text" defaultValue={resource.topics} placeholder="Topics" onChange={e => onChange(e, "topics")} />
            </div>
            <div className="resourceInfoEdit">
              <input type="text" defaultValue={resource.worksheetName} placeholder="Worksheet Name" onChange={e => onChange(e, "worksheetName")} />
            </div>
          </div>
          <div>
            <div className="resourceInfoEdit">
              <div>Worksheet File</div>
              <label className="fileUpload">
                <input type="file"/>
                <FontAwesomeIcon icon={faUpload} className="uploadIcon" /> File Upload
              </label>
            </div>
            <div className="resourceInfoEdit">
              <div>Solutions File</div>
              <label className="fileUpload">
                <input type="file"/>
                <FontAwesomeIcon icon={faUpload} className="uploadIcon" /> File Upload
              </label>
            </div>
          </div>
        </div>
        <button onClick={onSubmit} id="resourceButtonSubmit">
          <FontAwesomeIcon icon={faCheckCircle} id="saveIcon" /> SAVE
        </button>
      </div>
    </Modal>

  );
  // TODO:add cancel button that discards changes and resets edit
};

export default ResourceEdit;
