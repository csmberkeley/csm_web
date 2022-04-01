import React, { ChangeEvent, MouseEvent, useState, useEffect } from "react";
import _ from "lodash";
import Modal from "../Modal";
import {
  copyWorksheet,
  copyLink,
  emptyWorksheet,
  emptyLink,
  Worksheet,
  Link,
  FormErrors,
  Touched,
  emptyFormErrors,
  emptyTouched,
  allTouched,
  Resource
} from "./ResourceTypes";
import ResourceWorksheetEdit from "./ResourceWorksheetEdit";

import CheckCircle from "../../../static/frontend/img/check-circle-solid.svg";
import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";
import PlusCircle from "../../../static/frontend/img/plus-circle.svg";
import ResourceLinkEdit from "./ResourceLinkEdit";

interface ResourceEditProps {
  resource: Resource;
  onChange: (e: ChangeEvent<HTMLInputElement>, field: string) => void;
  onSubmit: (
    e: MouseEvent<HTMLButtonElement>,
    fileFormDataMap: Map<number, Worksheet>,
    linkMap: Map<number, Link>,
    newWorksheets: Worksheet[],
    newLinks: Link[]
  ) => void;
  onCancel: () => void;
}

/**
 * React component to handle editing of resources.
 */
export const ResourceEdit = ({ resource, onChange, onSubmit, onCancel }: ResourceEditProps): React.ReactElement => {
  /**
   * List of FormData objects representing the current (local) newly added worksheets.
   * When clicking the add worksheet button, a new empty FormData object should be added,
   * and on upload/edit of worksheet fields, the FormData object should be updated to reflect changes.
   */
  const [newWorksheets, setNewWorksheets] = useState<Array<Worksheet>>([]);
  const [newLinks, setNewLinks] = useState<Array<Link>>([]);
  const [formErrors, setFormErrors] = useState<FormErrors>(emptyFormErrors());
  const [touched, setTouched] = useState<Touched>(emptyTouched());
  const [isEditingLinks, setIsEditingLinks] = useState<boolean>(false);

  const resourceWorksheetMap = new Map();
  const resourceLinkMap = new Map();

  if (resource) {
    for (const worksheet of resource.worksheets) {
      // add copy of existing resource worksheet to map
      resourceWorksheetMap.set(worksheet.id, copyWorksheet(worksheet));
    }
    for (const link of resource.links) {
      // add copy of existing resource link to map
      resourceLinkMap.set(link.id, copyLink(link));
    }
  }

  /**
   * Mapping from worksheet id to FormData holding updated attributes
   */
  const [existingWorksheetMap, setExistingWorksheetMap] = useState<Map<number, Worksheet>>(resourceWorksheetMap);
  const [existingLinkMap, setExistingLinkMap] = useState<Map<number, Link>>(resourceLinkMap);

  /**
   * Validates form inputs, updating error strings and returning whether or not the fields are valid
   *
   * The `validateAll` parameter is needed because of the asynchronous state updates.
   *
   * @param validateAll whether all fields should be validated
   */
  function validate(validateAll = false) {
    const { weekNum, date, topics } = resource;
    const newFormErrors = { ...formErrors };
    newFormErrors["newWorksheets"] = new Map(newFormErrors["newWorksheets"]);
    newFormErrors["existingWorksheets"] = new Map(newFormErrors["existingWorksheets"]);
    newFormErrors["newLinks"] = new Map(newFormErrors["newLinks"]);
    newFormErrors["existingLinks"] = new Map(newFormErrors["existingLinks"]);
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
    let anyWorksheetsOrLinksInvalid = false;
    const allTouchedIndices = new Set();
    const allTouchedIds = new Set();
    for (const [index, worksheet] of newWorksheets.entries()) {
      if (validateAll || touched.newWorksheets.has(index)) {
        if (!worksheet.name) {
          newFormErrors["newWorksheets"].set(index, "Worksheet name is required");
          anyWorksheetsOrLinksInvalid = true;
        } else {
          newFormErrors["newWorksheets"].delete(index);
        }
        allTouchedIndices.add(index);
      }
    }
    for (const worksheetId of existingWorksheetMap.keys()) {
      const worksheet = existingWorksheetMap.get(worksheetId)!;
      if (validateAll || touched.existingWorksheets.has(worksheetId)) {
        if (worksheet.deleted && worksheet.deleted.includes("worksheet")) {
          newFormErrors["existingWorksheets"].delete(worksheetId);
          continue;
        }
        if (!worksheet.name) {
          newFormErrors["existingWorksheets"].set(worksheetId, "Worksheet name is required");
          anyWorksheetsOrLinksInvalid = true;
        } else {
          newFormErrors["existingWorksheets"].delete(worksheetId);
        }
        allTouchedIds.add(worksheetId);
      }
    }

    // Link validation
    const isValidURL = (url: string) => {
      let urlTest;
      try {
        urlTest = new URL(url);
      } catch (_) {
        return false;
      }
      return urlTest.protocol === "http:" || urlTest.protocol === "https:";
    };

    for (const [index, link] of newLinks.entries()) {
      if (validateAll || touched.newLinks.has(index)) {
        if (!link.name) {
          newFormErrors["newLinks"].set(index, "link name is required");
          anyWorksheetsOrLinksInvalid = true;
        } else if (!isValidURL(link.url)) {
          newFormErrors["newLinks"].set(index, "link url is invalid");
        } else {
          newFormErrors["newLinks"].delete(index);
        }
        allTouchedIndices.add(index);
      }
    }
    for (const linkId of existingLinkMap.keys()) {
      const link = existingLinkMap.get(linkId);
      console.log(link);
      if (link && (validateAll || touched.existingLinks.has(linkId))) {
        if (link.deleted) {
          newFormErrors["existingLinks"].delete(linkId);
          continue;
        }
        if (!link.name || !link.url) {
          newFormErrors["existingLinks"].set(linkId, "link name and url required");
          anyWorksheetsOrLinksInvalid = true;
        } else if (!isValidURL(link.url)) {
          newFormErrors["existingLinks"].set(linkId, "link url is invalid");
          anyWorksheetsOrLinksInvalid = true;
        } else {
          newFormErrors["existingLinks"].delete(linkId);
        }
        allTouchedIds.add(linkId);
      }
    }
    setFormErrors({ ...newFormErrors });
    setTouched(_.merge(touched, { newWorksheets: allTouchedIndices, existingWorksheets: allTouchedIds }));
    return !newFormErrors.weekNum && !newFormErrors.date && !newFormErrors.topics && !anyWorksheetsOrLinksInvalid;
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
    for (const errorMsg of formErrors.newWorksheets) {
      if (errorMsg) return false;
    }
    for (const errorMsg of formErrors.existingWorksheets) {
      if (errorMsg) return false;
    }
    for (const errorMsg of formErrors.newLinks) {
      if (errorMsg) return false;
    }
    for (const errorMsg of formErrors.existingLinks) {
      if (errorMsg) return false;
    }
    return true;
  }

  /**
   * Updates the touched fields when the user unfocuses from the field
   *
   * @param field string containing type of input field
   */
  function handleBlur(field: string) {
    setTouched({ ...touched, [field]: true });
  }

  /**
   *
   * @param worksheetId numerical ID of worksheet
   */
  function handleBlurExistingWorksheet(worksheetId: number) {
    const updatedExistingWorksheets = new Set(touched.existingWorksheets);
    updatedExistingWorksheets.add(worksheetId);
    setTouched({ ..._.merge(touched, { existingWorksheets: updatedExistingWorksheets }) });
  }

  /**
   *
   * @param index position of worksheet in resource's worksheet array
   */
  function handleBlurNewWorksheet(index: number) {
    const updatedNewWorksheets = new Set(touched.newWorksheets);
    updatedNewWorksheets.add(index);
    setTouched({ ..._.merge(touched, { newWorksheets: updatedNewWorksheets }) });
  }

  function handleBlurExistingLink(linkId: number) {
    const updatedExistingLinks = new Set(touched.existingLinks);
    updatedExistingLinks.add(linkId);
    setTouched({ ..._.merge(touched, { existingLinks: updatedExistingLinks }) });
  }

  function handleBlurNewLink(index: number) {
    const updatedNewLinks = new Set(touched.newLinks);
    updatedNewLinks.add(index);
    setTouched({ ..._.merge(touched, { newLinks: updatedNewLinks }) });
  }

  useEffect(() => {
    validate();
  }, [touched]);

  /**
   * Wrapper for the onSubmit function, validating all fields before submission.
   *
   * @param e onSubmit event
   */
  function handleSubmit(e: MouseEvent<HTMLButtonElement>) {
    // set all fields as touched for future validates
    setTouched(allTouched());

    // validate all fields
    if (validate(true)) {
      onSubmit(e, existingWorksheetMap, existingLinkMap, newWorksheets, newLinks);
    }
  }

  /**
   * Retrieves a worksheet from the worksheet map,
   * and calls the callback function on the worksheet.
   *
   * @param worksheetId Id of worksheet to retrieve
   * @param callback function to call on retrieved worksheet
   */
  function retrieveAndExecuteWorksheet(worksheetId: number, callback: (worksheet: Worksheet) => void) {
    let worksheet: Worksheet;
    if (existingWorksheetMap.has(worksheetId)) {
      worksheet = existingWorksheetMap.get(worksheetId)!;
    } else {
      console.error(`Worksheet not found: id ${worksheetId}`);
      return;
    }
    callback(worksheet);
    // update state and render
    setExistingWorksheetMap(new Map(existingWorksheetMap));
  }

  function retrieveAndExecuteLink(linkId: number, callback: (link: Link) => void) {
    let link: Link;
    if (existingLinkMap.has(linkId)) {
      link = existingLinkMap.get(linkId)!;
    } else {
      console.error(`Link not found: id ${linkId}`);
      return;
    }
    callback(link);
    // update state and render
    setExistingLinkMap(new Map(existingLinkMap));
  }

  /**
   * Modifies a specified file field of the current resource.
   *
   * @param e - onChange event
   * @param worksheetId - id of worksheet that was changed
   * @param field - resource field to change
   * @param getFile - whether file should be retrieved
   */
  function handleExistingWorksheetChange(
    e: ChangeEvent<HTMLInputElement>,
    worksheetId: number,
    field: "worksheetFile" | "solutionFile" | "name",
    getFile?: boolean
  ): void {
    // make sure the field is expected
    console.assert(
      field === "worksheetFile" || field === "solutionFile" || field === "name",
      `handleExistingWorksheetChange() field must be "worksheetFile" or "solutionFile" or "name"; got ${field}`
    );
    // retrieve worksheet FormData object
    retrieveAndExecuteWorksheet(worksheetId, worksheet => {
      // update field in worksheet FormData
      if (getFile) {
        console.assert(
          field === "worksheetFile" || field === "solutionFile",
          `handleExistingWorksheetChange() field must be "worksheetFile" or "solutionFile" if getFile is set; got ${field}`
        );
        const filefield = field as "worksheetFile" | "solutionFile"; // type coersion to avoid type error
        worksheet[filefield] = e.target.files![0]; // e.target.files should not be null
      } else {
        worksheet[field] = e.target.value;
      }
      // remove marker for deletion upon upload
      if (worksheet.deleted && worksheet.deleted.includes(field)) {
        worksheet.deleted.splice(worksheet.deleted.indexOf(field), 1);
      }
    });
  }

  function handleExistingLinkChange(
    e: React.ChangeEvent<HTMLInputElement>,
    linkId: number,
    field: "name" | "url"
  ): void {
    retrieveAndExecuteLink(linkId, link => {
      if (field == "name") link[field] = e.target.value;
      else link[field] = e.target.value;
    });
  }

  /**
   * Add 'deleted' attribute to mark the worksheet as deleted.
   *
   * The value should not matter (as the attribute should not exist
   * on worksheets that are not marked for deletion), but is set to true nonetheless.
   *
   * @param worksheetId id of worksheet that was deleted
   */
  function handleExistingWorksheetDelete(worksheetId: number): void {
    // update touched and formErrors
    const updatedFormErrors = { ...formErrors };
    updatedFormErrors.existingWorksheets = new Map(updatedFormErrors.existingWorksheets);
    updatedFormErrors.existingWorksheets.delete(worksheetId);
    setFormErrors(updatedFormErrors);

    retrieveAndExecuteWorksheet(worksheetId, worksheet => {
      if (worksheet.deleted == undefined || !(worksheet.deleted instanceof Array)) {
        worksheet.deleted = [];
      }
      if (!worksheet.deleted.includes("worksheet")) {
        worksheet.deleted.push("worksheet");
      }
    });
  }

  function handleExistingLinkDelete(linkId: number): void {
    const updatedFormErrors = { ...formErrors };
    updatedFormErrors.existingLinks = new Map(updatedFormErrors.existingLinks);
    updatedFormErrors.existingLinks.delete(linkId);
    setFormErrors(updatedFormErrors);

    retrieveAndExecuteLink(linkId, link => {
      link.deleted = true;
    });
  }

  /**
   * Marks a worksheet file for deletion.
   *
   * @param worksheetId worksheet id
   * @param field field of file to delete
   */
  function handleExistingWorksheetDeleteFile(worksheetId: number, field: "worksheetFile" | "solutionFile"): void {
    console.assert(
      field === "worksheetFile" || field === "solutionFile",
      `Expected "workheetFile" or "solutionFile"; got ${field}`
    );
    retrieveAndExecuteWorksheet(worksheetId, worksheet => {
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
    field: "worksheetFile" | "solutionFile" | "name",
    getFile?: boolean
  ): void {
    // make sure the field is expected
    console.assert(
      field === "worksheetFile" || field === "solutionFile" || field === "name",
      `handleNewWorksheetChange() field must be "worksheetFile" or "solutionFile" or "name"; got ${field}`
    );
    const worksheet = newWorksheets[index];
    if (getFile) {
      console.assert(
        field === "worksheetFile" || field === "solutionFile",
        `handleNewWorksheetChange() field must be "worksheetFile" or "solutionFile" or "name"; got ${field}`
      );
      const fileField = field as "worksheetFile" | "solutionFile"; // type coersion to avoid type error
      worksheet[fileField] = e.target.files![0]; // e.target.files should not be null
    } else {
      worksheet[field] = e.target.value;
    }
    // update state and render
    setNewWorksheets([...newWorksheets]);
  }

  function handleNewLinkChange(e: ChangeEvent<HTMLInputElement>, index: number, field: "name" | "url"): void {
    const link = newLinks[index];
    link[field] = e.target.value;
    setNewLinks([...newLinks]);
  }

  /**
   * Removes the new worksheet from the list.
   *
   * @param index index in newWorksheets
   */
  function handleNewWorksheetDelete(index: number): void {
    const updated = [...newWorksheets];
    updated.splice(index, 1);
    setNewWorksheets([...updated]);

    // update touched and formErrors
    const updatedTouched = { ...touched };
    const oldWorksheets: Set<number> = updatedTouched.newWorksheets;
    updatedTouched.newWorksheets = new Set();
    for (const idx of oldWorksheets) {
      if (idx < index) {
        updatedTouched.newWorksheets.add(idx);
      } else if (idx > index) {
        // shift indices after deleted worksheet
        updatedTouched.newWorksheets.add(idx - 1);
      }
    }
    setTouched(updatedTouched);
    const updatedFormErrors = { ...formErrors };
    const oldWorksheetErrors = updatedFormErrors.newWorksheets;
    updatedFormErrors.newWorksheets = new Map();
    for (const [idx, error] of oldWorksheetErrors.entries()) {
      if (idx < index) {
        updatedFormErrors.newWorksheets.set(idx, error);
      } else if (idx > index) {
        // shift indices after deleted worksheet
        updatedFormErrors.newWorksheets.set(idx - 1, error);
      }
    }
    setFormErrors(updatedFormErrors);
  }

  function handleNewLinkDelete(index: number): void {
    const updated = [...newLinks];
    updated.splice(index, 1);
    setNewLinks([...updated]);

    // update touched and formErrors
    const updatedTouched = { ...touched };
    const oldLinks: Set<number> = updatedTouched.newLinks;
    updatedTouched.newLinks = new Set();
    for (const idx of oldLinks) {
      if (idx < index) {
        updatedTouched.newLinks.add(idx);
      } else if (idx > index) {
        // shift indices after deleted worksheet
        updatedTouched.newLinks.add(idx - 1);
      }
    }
    setTouched(updatedTouched);
  }

  /**
   * Deletes a worksheet file from the array of new worksheets.
   *
   * @param index worksheet index to delete from
   * @param field field of worksheet to delete
   */
  function handleNewWorksheetDeleteFile(index: number, field: "worksheetFile" | "solutionFile"): void {
    console.assert(
      field === "worksheetFile" || field === "solutionFile",
      `Expected "workheetFile" or "solutionFile"; got ${field}`
    );
    // delete field of worksheet reference in map
    const worksheet = newWorksheets[index];
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
  function handleAddLink(): void {
    setNewLinks([...newLinks, emptyLink()]);
  }

  const existingWorksheetDisplay =
    existingWorksheetMap &&
    [...existingWorksheetMap.values()].map(worksheet =>
      worksheet.deleted && worksheet.deleted.includes("worksheet") ? undefined : (
        <ResourceWorksheetEdit
          key={worksheet.id}
          worksheet={worksheet}
          onChange={handleExistingWorksheetChange}
          onDelete={handleExistingWorksheetDelete}
          onDeleteFile={handleExistingWorksheetDeleteFile}
          onBlur={() => handleBlurExistingWorksheet(worksheet.id)}
          formErrorsMap={formErrors.existingWorksheets}
        ></ResourceWorksheetEdit>
      )
    );

  const existingLinkDisplay =
    existingLinkMap &&
    [...existingLinkMap.values()].map(link => (
      <ResourceLinkEdit
        key={link.id}
        link={link}
        onChange={handleExistingLinkChange}
        onDelete={handleExistingLinkDelete}
        onBlur={() => handleBlurExistingLink(link.id)}
        formErrorsMap={formErrors.existingLinks}
      ></ResourceLinkEdit>
    ));

  const newWorksheetDisplay =
    newWorksheets &&
    newWorksheets.map((worksheet, index) => (
      <ResourceWorksheetEdit
        key={index}
        worksheet={worksheet}
        onChange={handleNewWorksheetChange}
        index={index}
        onDelete={handleNewWorksheetDelete}
        onDeleteFile={handleNewWorksheetDeleteFile}
        onBlur={() => handleBlurNewWorksheet(index)}
        formErrorsMap={formErrors.newWorksheets}
      ></ResourceWorksheetEdit>
    ));

  const newLinkDisplay =
    newLinks &&
    newLinks.map((link, index) => (
      <ResourceLinkEdit
        key={index}
        index={index}
        link={link}
        onChange={handleNewLinkChange}
        onDelete={handleNewLinkDelete}
        onBlur={() => handleBlurNewLink(index)}
        formErrorsMap={formErrors.newLinks}
      ></ResourceLinkEdit>
    ));

  const hasWorksheets =
    existingWorksheetMap && newWorksheets && (existingWorksheetDisplay.length > 0 || newWorksheetDisplay.length > 0);
  const hasLinks = existingLinkMap && newLinks && (existingLinkDisplay.length > 0 || newLinkDisplay.length > 0);

  return (
    <Modal closeModal={onCancel} className="resourceEditModal">
      <div className="resourceEditContainer">
        <div className="resourceEditContentWrapper">
          <div className="resourceEditContent">
            <div className="resourceEditTabContainer">
              <button
                onClick={() => {
                  setIsEditingLinks(false);
                }}
                className="resourceEditTab"
                disabled={!isEditingLinks}
              >
                Edit Worksheets
              </button>
              <button
                onClick={() => {
                  setIsEditingLinks(true);
                }}
                className="resourceEditTab"
                disabled={isEditingLinks}
              >
                Edit Links
              </button>
            </div>
            <div id="resourceEditInner">
              <div className="resourceInfoEdit">
                <div className="resourceEditHeadItem">Week Number</div>
                <input
                  type="text"
                  defaultValue={resource.weekNum}
                  placeholder="Week Number"
                  onChange={e => onChange(e, "weekNum")}
                  onBlur={() => handleBlur("weekNum")}
                />
                <div className="resourceValidationError">
                  {formErrors.weekNum && <ExclamationCircle className="icon exclamationIcon" />}
                  {formErrors.weekNum}
                </div>
              </div>
              <div className="resourceInfoEdit">
                <div className="resourceEditHeadItem">Date</div>
                <input
                  type="date"
                  defaultValue={resource.date}
                  onChange={e => onChange(e, "date")}
                  onBlur={() => handleBlur("date")}
                />
                <div className="resourceValidationError">
                  {formErrors.date && <ExclamationCircle className="icon exclamationIcon" />}
                  {formErrors.date}
                </div>
              </div>
              <div className="resourceInfoEdit">
                <div className="resourceEditHeadItem">Topics</div>
                <input
                  type="text"
                  defaultValue={resource.topics}
                  placeholder="Topics"
                  onChange={e => onChange(e, "topics")}
                  onBlur={() => handleBlur("topics")}
                />
                <div className="resourceValidationError">
                  {formErrors.topics && <ExclamationCircle className="icon exclamationIcon" />}
                  {formErrors.topics}
                </div>
              </div>
            </div>
            {!isEditingLinks && (
              <div className="resourceWorksheetContainer">
                {hasWorksheets && (
                  <div className="resourceWorksheetHead">
                    <div className="resourceWorksheetHeadItem">Name</div>
                    <div className="resourceWorksheetHeadItem">Worksheet File</div>
                    <div className="resourceWorksheetHeadItem">Solution File</div>
                  </div>
                )}
                {existingWorksheetDisplay}
                {newWorksheetDisplay}
                <button onClick={handleAddWorksheet} className="addResourceButton" id="addWorksheetButton">
                  <PlusCircle className="icon" id="plusIcon" />
                  Add Worksheet
                </button>
              </div>
            )}
            {isEditingLinks && (
              <div className="resourceWorksheetContainer">
                {hasLinks && (
                  <div className="resourceWorksheetHead">
                    <div className="resourceWorksheetHeadItem">Name</div>
                    <div className="resourceWorksheetHeadItem">URL</div>
                  </div>
                )}
                {existingLinkDisplay}
                {newLinkDisplay}
                <button onClick={handleAddLink} id="addLinkButton" className="addResourceButton">
                  <PlusCircle className="icon" id="plusIcon" />
                  Add Link
                </button>
              </div>
            )}
          </div>
        </div>
        <button onClick={handleSubmit} id="resourceButtonSubmit" disabled={!checkValid()}>
          <CheckCircle className="icon" id="saveIcon" /> SAVE
        </button>
      </div>
    </Modal>
  );
};

export default ResourceEdit;
