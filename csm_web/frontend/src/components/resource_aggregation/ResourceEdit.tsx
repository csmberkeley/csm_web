import React, { ChangeEvent, useState, useEffect } from "react";
import _ from "lodash";
import Modal from "../Modal";
import { copyWorksheet, emptyWorksheet, ResourceEditProps, Worksheet } from "./ResourceTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faExclamationCircle, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import ResourceWorksheetEdit from "./ResourceWorksheetEdit";

const DEFAULT_FORM_ERRORS = {
  weekNum: "",
  date: "",
  topics: "",
  // mapping of worksheet id/index to error string
  existingWorksheets: new Map(),
  newWorksheets: new Map()
};

const DEFAULT_TOUCHED = {
  weekNum: false,
  date: false,
  topics: false,
  // set of ids/indices of touched worksheets
  existingWorksheets: new Set(),
  newWorksheets: new Set()
};

const ALL_TOUCHED = {
  weekNum: true,
  date: true,
  topics: true,
  existingWorksheets: new Set(),
  newWorksheets: new Set()
};

/**
 * React component to handle editing of resources.
 */
export const ResourceEdit = ({ resource, onChange, onSubmit, onCancel }: ResourceEditProps) => {
  /**
   * List of FormData objects representing the current (local) newly added worksheets.
   * When clicking the add worksheet button, a new empty FormData object should be added,
   * and on upload/edit of worksheet fields, the FormData object should be updated to reflect changes.
   */
  const [newWorksheets, setNewWorksheets] = useState([]);
  const [formErrors, setFormErrors] = useState(DEFAULT_FORM_ERRORS);
  const [touched, setTouched] = useState(DEFAULT_TOUCHED);

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
   * Validates form inputs, updating error strings and returning whether or not the fields are valid
   *
   * The `validateAll` parameter is needed because of the asynchronous state updates.
   *
   * @param validateAll whether all fields should be validated
   */
  function validate(validateAll = false) {
    const { weekNum, date, topics } = resource;
    let newFormErrors = { ...formErrors };
    newFormErrors["newWorksheets"] = new Map(newFormErrors["newWorksheets"]);
    newFormErrors["existingWorksheets"] = new Map(newFormErrors["existingWorksheets"]);
    if (validateAll || touched.weekNum) {
      let weekNumError = "";
      if (!weekNum) {
        weekNumError = "Week Number is required";
      } else if (isNaN(weekNum)) {
        weekNumError = "Week Number must be a number";
      }
      newFormErrors["weekNum"] = weekNumError;
    }
    if (validateAll || touched.date) {
      newFormErrors["date"] = date ? "" : "Date is required";
    }
    if (validateAll || touched.topics) {
      newFormErrors["topics"] = topics ? "" : "Topics is required";
    }

    // handle worksheet validation
    let anyWorksheetsInvalid = false;
    let allTouchedIndices = new Set();
    let allTouchedIds = new Set();
    for (let [index, worksheet] of newWorksheets.entries()) {
      if (validateAll || touched.newWorksheets.has(index)) {
        if (!worksheet.name) {
          newFormErrors["newWorksheets"].set(index, "Worksheet name is required");
          anyWorksheetsInvalid = true;
        } else {
          newFormErrors["newWorksheets"].delete(index);
        }
        allTouchedIndices.add(index);
      }
    }
    for (let worksheetId of existingWorksheetMap.keys()) {
      let worksheet = existingWorksheetMap.get(worksheetId);
      if (validateAll || touched.existingWorksheets.has(worksheetId)) {
        if (worksheet.deleted && worksheet.deleted.includes("worksheet")) {
          newFormErrors["existingWorksheets"].delete(worksheetId);
          continue;
        }
        if (!worksheet.name) {
          newFormErrors["existingWorksheets"].set(worksheetId, "Worksheet name is required");
          anyWorksheetsInvalid = true;
        } else {
          newFormErrors["existingWorksheets"].delete(worksheetId);
        }
        allTouchedIds.add(worksheetId);
      }
    }
    setFormErrors({ ...newFormErrors });
    setTouched(_.merge(touched, { newWorksheets: allTouchedIndices, existingWorksheets: allTouchedIds }));
    return !newFormErrors.weekNum && !newFormErrors.date && !newFormErrors.topics && !anyWorksheetsInvalid;
  }

  /**
   * Checks formErrors to see if there are any error messages
   *
   * @returns whether or not the fields are valid
   */
  function checkValid(): boolean {
    // resource fields invalid
    if (formErrors.weekNum || formErrors.date || formErrors.topics) {
      return false;
    }
    // worksheet fields
    for (let errorMsg of formErrors.newWorksheets) {
      if (errorMsg) return false;
    }
    for (let errorMsg of formErrors.existingWorksheets) {
      if (errorMsg) return false;
    }
    return true;
  }

  /**
   * Updates the touched fields when the user unfocuses from the field
   *
   * @param field string containing type of input field
   */
  function handleBlur(field) {
    setTouched({ ...touched, [field]: true });
  }

  function handleBlurExistingWorksheet(worksheetId) {
    let updatedExistingWorksheets = new Set(touched.existingWorksheets);
    updatedExistingWorksheets.add(worksheetId);
    setTouched({ ..._.merge(touched, { existingWorksheets: updatedExistingWorksheets }) });
  }

  function handleBlurNewWorksheet(index) {
    let updatedNewWorksheets = new Set(touched.newWorksheets);
    updatedNewWorksheets.add(index);
    setTouched({ ..._.merge(touched, { newWorksheets: updatedNewWorksheets }) });
  }

  useEffect(() => {
    validate();
  }, [touched]);

  /**
   * Wrapper for the onSubmit function, validating all fields before submission.
   *
   * @param e onSubmit event
   */
  function handleSubmit(e) {
    // set all fields as touched for future validates
    setTouched(ALL_TOUCHED);

    // validate all fields
    if (validate(true)) {
      onSubmit(e, existingWorksheetMap, newWorksheets);
    }
  }

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
      field === "worksheetFile" || field === "solutionFile" || field === "name",
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
   * @param e event object
   * @param worksheetId id of worksheet that was deleted
   */
  function handleExistingWorksheetDelete(e, worksheetId: number): void {
    // update touched and formErrors
    let updatedFormErrors = { ...formErrors };
    updatedFormErrors.existingWorksheets = new Map(updatedFormErrors.existingWorksheets);
    updatedFormErrors.existingWorksheets.delete(worksheetId);
    setFormErrors(updatedFormErrors);

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
   * @param e event object
   * @param worksheetId worksheet id
   * @param field field of file to delete
   */
  function handleExistingWorksheetDeleteFile(e, worksheetId: number, field: string): void {
    console.assert(
      field === "worksheetFile" || field === "solutionFile",
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
   * Handles updating newly created worksheets.
   *
   * @param e event object
   * @param index new worksheet index in array
   * @param field changed field in worksheet
   * @param getFile whether the user uploaded a new file
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

    // update touched and formErrors
    let updatedTouched = { ...touched };
    updatedTouched.newWorksheets = new Set(updatedTouched.newWorksheets);
    updatedTouched.newWorksheets.delete(index);
    setTouched(updatedTouched);
    let updatedFormErrors = { ...formErrors };
    updatedFormErrors.newWorksheets = new Map(updatedFormErrors.newWorksheets);
    updatedFormErrors.newWorksheets.delete(index);
    setFormErrors(updatedFormErrors);
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
      field === "worksheetFile" || field === "solutionFile",
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

  let existingDisplay =
    existingWorksheetMap &&
    [...existingWorksheetMap.values()].map(worksheet =>
      worksheet.deleted && worksheet.deleted.includes("worksheet") ? undefined : (
        <ResourceWorksheetEdit
          key={worksheet.id}
          worksheet={worksheet}
          onChange={handleExistingWorksheetChange}
          onDelete={handleExistingWorksheetDelete}
          onDeleteFile={handleExistingWorksheetDeleteFile}
          onBlur={e => handleBlurExistingWorksheet(worksheet.id)}
          formErrorsMap={formErrors.existingWorksheets}
        ></ResourceWorksheetEdit>
      )
    );

  let newDisplay =
    newWorksheets &&
    newWorksheets.map((worksheet, index) => (
      <ResourceWorksheetEdit
        key={index}
        worksheet={worksheet}
        onChange={handleNewWorksheetChange}
        index={index}
        onDelete={handleNewWorksheetDelete}
        onDeleteFile={handleNewWorksheetDeleteFile}
        onBlur={e => handleBlurNewWorksheet(index)}
        formErrorsMap={formErrors.newWorksheets}
      ></ResourceWorksheetEdit>
    ));

  let hasWorksheets = existingWorksheetMap && newWorksheets && (existingDisplay.length > 0 || newDisplay.length > 0);

  return (
    <Modal closeModal={onCancel as any} className="resourceEditModal">
      <div className="resourceEditContainer">
        <div id="resourceEditInner">
          <div className="resourceInfoEdit">
            <input
              type="text"
              defaultValue={resource.weekNum}
              placeholder="Week Number"
              onChange={e => onChange(e, "weekNum")}
              onBlur={e => handleBlur("weekNum")}
            />
            <div className="resourceValidationError">
              {formErrors.weekNum && <FontAwesomeIcon icon={faExclamationCircle} className="exclamationIcon" />}
              {formErrors.weekNum}
            </div>
          </div>
          <div className="resourceInfoEdit">
            <input
              type="date"
              defaultValue={resource.date}
              onChange={e => onChange(e, "date")}
              onBlur={e => handleBlur("date")}
            />
            <div className="resourceValidationError">
              {formErrors.date && <FontAwesomeIcon icon={faExclamationCircle} className="exclamationIcon" />}
              {formErrors.date}
            </div>
          </div>
          <div className="resourceInfoEdit">
            <input
              type="text"
              defaultValue={resource.topics}
              placeholder="Topics"
              onChange={e => onChange(e, "topics")}
              onBlur={e => handleBlur("topics")}
            />
            <div className="resourceValidationError">
              {formErrors.topics && <FontAwesomeIcon icon={faExclamationCircle} className="exclamationIcon" />}
              {formErrors.topics}
            </div>
          </div>
        </div>
        <div className="resourceWorksheetContainer">
          {hasWorksheets && (
            <div className="resourceWorksheetHead">
              <div className="resourceWorksheetHeadItem">Name</div>
              <div className="resourceWorksheetHeadItem">Worksheet File</div>
              <div className="resourceWorksheetHeadItem">Solution File</div>
            </div>
          )}
          {existingDisplay}
          {newDisplay}
          <button onClick={handleAddWorksheet} id="addWorksheetButton">
            <FontAwesomeIcon icon={faPlusCircle} id="plusIcon" />
            Add Worksheet
          </button>
        </div>
        <button onClick={handleSubmit} id="resourceButtonSubmit" disabled={!checkValid()}>
          <FontAwesomeIcon icon={faCheckCircle} id="saveIcon" /> SAVE
        </button>
      </div>
    </Modal>
  );
};

export default ResourceEdit;
