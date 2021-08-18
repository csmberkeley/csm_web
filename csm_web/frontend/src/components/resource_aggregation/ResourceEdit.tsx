import React, { ChangeEvent, useState } from "react";
import Modal, { ModalCloser } from "../Modal";
import { copyWorksheet, emptyWorksheet, ResourceEditProps, Worksheet } from "./ResourceTypes";
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

  let resourceWorksheetMap = new Map();
  if (resource) {
    for (let worksheet of resource.worksheets) {
      // add copy of existing resource worksheet to map
      resourceWorksheetMap.set(worksheet.id, copyWorksheet(worksheet));
    }
  }

  /**
   * Mapping from worksheet id to FormData holding updated attributes
   */
  const [existingWorksheetMap, setExistingWorksheetMap]: [Map<number, Worksheet>, Function] = useState(
    resourceWorksheetMap
  );

  /**
   * Retrieves a worksheet from the worksheet map,
   * and calls the callback function on the worksheet.
   *
   * @param worksheetId Id of worksheet to retrieve
   * @param callback function to call on retrieved worksheet
   */
  function retrieveAndExecute(worksheetId: number, callback: (worksheet: Worksheet) => void) {
    let worksheet;
    if (existingWorksheetMap.has(worksheetId)) {
      worksheet = existingWorksheetMap.get(worksheetId);
    } else {
      console.error(`Worksheet not found: id ${worksheet.id}`);
    }
    callback(worksheet);
    // update state and render
    setExistingWorksheetMap(new Map(existingWorksheetMap));
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
    retrieveAndExecute(worksheetId, worksheet => {
      // update field in worksheet FormData
      if (getFile) {
        worksheet[field] = e.target.files[0];
      } else {
        worksheet[field] = e.target.value;
      }
      // remove marker for deletion upon upload
      if (worksheet.deleted && worksheet.deleted.includes(field)) {
        worksheet.deleted.splice(worksheet.deleted.indexOf(field), 1);
      }
    });
  }

  /**
   * Add 'deleted' attribute to mark the worksheet as deleted.
   *
   * The value should not matter (as the attribute should not exist
   * on worksheets that are not marked for deletion), but is set to true nonetheless.
   *
   * TODO: update view to remove the deleted worksheet from the modal
   */
  function handleExistingWorksheetDelete(e, worksheetId: number): void {
    retrieveAndExecute(worksheetId, worksheet => {
      if (worksheet.deleted == undefined || !(worksheet.deleted instanceof Array)) {
        worksheet.deleted = [];
      }
      if (!worksheet.deleted.includes("worksheet")) {
        worksheet.deleted.push("worksheet");
      }
    });
  }

  /**
   * Marks a worksheet file for deletion.
   *
   * @param e event
   * @param worksheetId worksheet id
   * @param field field of file to delete
   */
  function handleExistingWorksheetDeleteFile(e, worksheetId: number, field: string): void {
    console.assert(
      field == "worksheetFile" || field == "solutionFile",
      `Expected "workheetFile" or "solutionFile"; got ${field}`
    );
    retrieveAndExecute(worksheetId, worksheet => {
      if (worksheet.deleted == undefined || !(worksheet.deleted instanceof Array)) {
        worksheet.deleted = [];
      }
      if (!worksheet.deleted.includes(field)) {
        worksheet.deleted.push(field);
      }
    });
  }

  /**
   * Handle updating newly created worksheets.
   */
  function handleNewWorksheetChange(
    e: ChangeEvent<HTMLInputElement>,
    index: number,
    field: string,
    getFile: boolean
  ): void {
    console.log("new worksheet change");
    let worksheet = newWorksheets[index];
    if (getFile) {
      worksheet[field] = e.target.files[0];
    } else {
      worksheet[field] = e.target.value;
    }
    // update state and render
    setNewWorksheets([...newWorksheets]);
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
    setNewWorksheets([...updated]);
  }

  /**
   * Deletes a worksheet file from the array of new worksheets.
   *
   * @param e event object
   * @param index worksheet index to delete from
   * @param field field of worksheet to delete
   */
  function handleNewWorksheetDeleteFile(e, index: number, field: string): void {
    console.assert(
      field == "worksheetFile" || field == "solutionFile",
      `Expected "workheetFile" or "solutionFile"; got ${field}`
    );
    // delete field of worksheet reference in map
    let worksheet = newWorksheets[index];
    worksheet[field] = "";
    // update and render
    setNewWorksheets([...newWorksheets]);
  }

  /**
   * Add a new empty worksheet with null id to the local state.
   */
  function handleAddWorksheet(): void {
    setNewWorksheets([...newWorksheets, emptyWorksheet()]);
  }

  /**
   * Clean up worksheets before canceling the edit.
   */
  function preOnCancel(): void {
    // reset all deleted attributes
    // for (let worksheet of existingWorksheetMap.values()) {
    //   worksheet.deleted = undefined;
    // }
    onCancel();
  }

  return (
    <Modal closeModal={preOnCancel} className="resourceEditModal">
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
            {existingWorksheetMap &&
              [...existingWorksheetMap.values()].map(worksheet =>
                worksheet.deleted && worksheet.deleted.includes("worksheet") ? undefined : (
                  <ResourceWorksheetEdit
                    key={worksheet.id}
                    worksheet={worksheet}
                    onChange={handleExistingWorksheetChange}
                    onDelete={handleExistingWorksheetDelete}
                    onDeleteFile={handleExistingWorksheetDeleteFile}
                  ></ResourceWorksheetEdit>
                )
              )}
            {newWorksheets &&
              newWorksheets.map((worksheet, index) => (
                <ResourceWorksheetEdit
                  key={index}
                  worksheet={worksheet}
                  onChange={handleNewWorksheetChange}
                  index={index}
                  onDelete={handleNewWorksheetDelete}
                  onDeleteFile={handleNewWorksheetDeleteFile}
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
