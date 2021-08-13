import React, { useState } from "react";
import Modal, { ModalCloser } from "../Modal";
import { ResourceEditProps } from "./ResourceTypes";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faCheckCircle } from '@fortawesome/free-solid-svg-icons'

export const ResourceEdit = ({ resource, onChange, onFileChange, onSubmit, onCancel }: ResourceEditProps) => {
  /**
   * List of FormData objects representing the current (local) newly added worksheets.
   * When clicking the add worksheet button, a new empty FormData object should be added,
   * and on upload/edit of worksheet fields, the FormData object should be updated to reflect changes.
   */
  const [newWorksheets, setNewWorksheets] = useState([]);

  /**
   * TODO: update newWorksheets with new uploaded contents
   * - how do we differentiate between newly added worksheets?
   *    - pass the index as the worksheet id (when passing in the worksheet to the WorksheetEdit component,
   *      pre-populate id with the index and pass in `handleAddWorksheet` instead of `onFileChange`)
   *
   * @param e
   * @param field
   */
  function handleUpdateWorksheet(e, index, field) {

  }

  function handleAddWorksheet() {
    newWorksheets.push(new FormData());
    setNewWorksheets(newWorksheets);
  }

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
          </div>
          <div>
          {resource.worksheets ?
            resource.worksheets.map(worksheet => (
              <div key={worksheet.id}>
                <div className="resourceInfoEdit">
                  <input type="text" defaultValue={worksheet.name} placeholder="Worksheet Name" onChange={e => onFileChange(e, worksheet.id, "name")} />
                </div>
                <div className="resourceInfoEdit">
                  <div>Worksheet File</div>
                  <label className="fileUpload">
                    <input type="file" onChange={e => onFileChange(e, worksheet.id, "worksheetFile")}/>
                    <FontAwesomeIcon icon={faUpload} className="uploadIcon" />
                    {worksheet.worksheetFile ? "Upload File" : "Re-upload File"}
                  </label>
                </div>
                <div className="resourceInfoEdit">
                  <div>Solutions File</div>
                  <label className="fileUpload">
                    <input type="file" onChange={e => onFileChange(e, worksheet.id, "solutionFile")}/>
                    <FontAwesomeIcon icon={faUpload} className="uploadIcon" />
                    {worksheet.solutionFile ? "Upload File" : "Re-upload File"}
                  </label>
                </div>
              </div>))
              :
              <div>
                <div className="resourceInfoEdit">
                  <input type="text" placeholder="Worksheet Name" onChange={e => onChange(e, "worksheetName")} />
                </div>
                <div className="resourceInfoEdit">
                  <div>Worksheet File</div>
                  <label className="fileUpload">
                    <input type="file" onChange={e => onFileChange(e, "worksheetFile")}/>
                    <FontAwesomeIcon icon={faUpload} className="uploadIcon" /> File Upload
                  </label>
                </div>
                <div className="resourceInfoEdit">
                  <div>Solutions File</div>
                  <label className="fileUpload">
                    <input type="file" onChange={e => onFileChange(e, "solutionFile")}/>
                    <FontAwesomeIcon icon={faUpload} className="uploadIcon" /> File Upload
                  </label>
                </div>
              </div>
          }
          <button onClick={handleAddWorksheet}>Add worksheet</button>
          </div>
        </div>
        <button onClick={() => onSubmit(newWorksheets)} id="resourceButtonSubmit">
          <FontAwesomeIcon icon={faCheckCircle} id="saveIcon" /> SAVE
        </button>
      </div>
    </Modal>

  );
  // TODO:add cancel button that discards changes and resets edit
};

export default ResourceEdit;
