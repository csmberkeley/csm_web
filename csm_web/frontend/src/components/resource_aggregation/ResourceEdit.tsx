import React, { ChangeEvent, useState } from "react";
import Modal, { ModalCloser } from "../Modal";
import { emptyWorksheet, ResourceEditProps, Worksheet } from "./ResourceTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import ResourceWorksheetEdit from "./ResourceWorksheetEdit";

export const ResourceEdit = ({ resource, onChange, onSubmit, onCancel }: ResourceEditProps) => {
  /**
   * List of FormData objects representing the current (local) newly added worksheets.
   * When clicking the add worksheet button, a new empty FormData object should be added,
   * and on upload/edit of worksheet fields, the FormData object should be updated to reflect changes.
   */
  const [newWorksheets, setNewWorksheets] = useState([]);

  /**
   * Mapping from worksheet id to FormData holding updated attributes
   */
  const [existingWorksheetMap, setExistingWorksheetMap]: [Map<number, Worksheet>, Function] = useState(new Map());

  /**
   * Handle updating newly created worksheets.
   */
  function handleNewWorksheetChange(
    e: ChangeEvent<HTMLInputElement>,
    index: number,
    field: string,
    getFile: boolean
  ): void {
    let worksheet = newWorksheets[index];
    if (getFile) {
      worksheet[field] = e.target.files[0];
    } else {
      worksheet[field] = e.target.value;
    }
  }

  /**
   * Modifies a specified file field of the current resource.
   *
   * @param e - onChange event
   * @param worksheetId - id of worksheet that was changed
   * @param field - resource field to change
   */
  function handleExistingWorksheetChange(
    e: ChangeEvent<HTMLInputElement>,
    worksheetId: number,
    field: string,
    getFile: boolean
  ): void {
    // make sure the field is expected; TODO: maybe remove afterward?
    console.assert(
      field == "worksheetFile" || field == "solutionFile" || field == "name",
      `handleFileChange() field must be "worksheetFile" or "solutionFile" or "name"; got ${field}`
    );
    // retrieve worksheet FormData object
    // TODO: also look in the resource worksheet attribute for data, as currently
    // it always creates a new worksheet after first initialization
    let worksheet: Worksheet;
    if (existingWorksheetMap.has(worksheetId)) {
      worksheet = existingWorksheetMap.get(worksheetId);
    } else {
      worksheet = emptyWorksheet();
      worksheet.id = worksheetId;
      existingWorksheetMap.set(worksheetId, worksheet);
    }
    // update field in worksheet FormData
    if (getFile) {
      worksheet[field] = e.target.files[0];
    } else {
      worksheet[field] = e.target.value;
    }
    setExistingWorksheetMap(existingWorksheetMap);
  }

  /**
   * Add 'deleted' attribute to mark the worksheet as deleted.
   *
   * The value should not matter (as the attribute should not exist
   * on worksheets that are not marked for deletion), but is set to true nonetheless.
   *
   * TODO: update view to remove the deleted worksheet from the modal
   */
  function handleExistingWorksheetDelete(e, worksheetId): void {
    let worksheet;
    if (existingWorksheetMap.has(worksheetId)) {
      worksheet = existingWorksheetMap.get(worksheetId);
    } else {
      worksheet = emptyWorksheet();
      worksheet.id = worksheetId;
      existingWorksheetMap.set(worksheetId, worksheet);
    }
    worksheet.deleted = true;
    setExistingWorksheetMap(existingWorksheetMap);
  }

  /**
   * Removes the new worksheet from the list.
   *
   * @param e event object
   * @param index index in newWorksheets
   */
  function handleNewWorksheetDelete(e, index: number): void {
    let updated = [...newWorksheets];
    updated.splice(index, 1);
    setNewWorksheets(updated);
  }

  /**
   * Add a new empty worksheet with null id to the local state.
   */
  function handleAddWorksheet(): void {
    setNewWorksheets([...newWorksheets, emptyWorksheet()]);
  }

  return (
    <Modal closeModal={onCancel as any} className="resourceEditModal">
      <div className="resourceEditContainer">
        <div id="resourceEditInner">
          <div>
            <div className="resourceInfoEdit">
              <input
                type="text"
                defaultValue={resource.weekNum}
                placeholder="Week Number"
                onChange={e => onChange(e, "weekNum")}
              />
            </div>
            <div className="resourceInfoEdit">
              <input type="date" defaultValue={resource.date} onChange={e => onChange(e, "date")} />
            </div>
            <div className="resourceInfoEdit">
              <input
                type="text"
                defaultValue={resource.topics}
                placeholder="Topics"
                onChange={e => onChange(e, "topics")}
              />
            </div>
          </div>
          <div>
            {resource.worksheets ? (
              resource.worksheets.map(worksheet => (
                <ResourceWorksheetEdit
                  key={worksheet.id}
                  worksheet={worksheet}
                  onChange={handleExistingWorksheetChange}
                  onDelete={handleExistingWorksheetDelete}
                ></ResourceWorksheetEdit>
              ))
            ) : (
              <div>
                {/* <div className="resourceInfoEdit">
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
                </div> */}
              </div>
            )}
            {newWorksheets.length &&
              newWorksheets.map((worksheet, index) => (
                <ResourceWorksheetEdit
                  key={index}
                  worksheet={worksheet}
                  onChange={handleNewWorksheetChange}
                  index={index}
                  onDelete={handleNewWorksheetDelete}
                ></ResourceWorksheetEdit>
              ))}
            <button onClick={handleAddWorksheet}>Add worksheet</button>
          </div>
        </div>
        <button onClick={e => onSubmit(e, existingWorksheetMap, newWorksheets)} id="resourceButtonSubmit">
          <FontAwesomeIcon icon={faCheckCircle} id="saveIcon" /> SAVE
        </button>
      </div>
    </Modal>
  );
};

export default ResourceEdit;
