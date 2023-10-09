import _ from "lodash";
import React, { ChangeEvent, MouseEvent, useState, useEffect } from "react";

import Modal from "../Modal";
import { Tooltip } from "../Tooltip";
import ResourceLinkEdit from "./ResourceLinkEdit";
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
import PlusIcon from "../../../static/frontend/img/plus.svg";

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

    // Link validation: returns 0 if not valid, 1 if valid, 2 if valid when https:// appended
    const isValidURL = (url: string) => {
      let urlTest;
      try {
        urlTest = new URL(url);
      } catch {
        try {
          urlTest = new URL("https://" + url);
          return urlTest.protocol === "http:" || urlTest.protocol === "https:" ? 2 : 0;
        } catch {
          return 0;
        }
      }
      return urlTest.protocol === "http:" || urlTest.protocol === "https:" ? 1 : 0;
    };

    for (const [index, link] of newLinks.entries()) {
      if (validateAll || touched.newLinks.has(index)) {
        if (!link.name) {
          newFormErrors["newLinks"].set(index, "link name is required");
          anyWorksheetsOrLinksInvalid = true;
        } else if (!isValidURL(link.url)) {
          newFormErrors["newLinks"].set(index, "link URL is invalid");
        } else {
          newFormErrors["newLinks"].delete(index);
        }
        allTouchedIndices.add(index);
      }
    }
    for (const linkId of existingLinkMap.keys()) {
      const link = existingLinkMap.get(linkId);
      if (link && (validateAll || touched.existingLinks.has(linkId))) {
        if (link.deleted) {
          newFormErrors["existingLinks"].delete(linkId);
          continue;
        }
        if (!link.name || !link.url) {
          newFormErrors["existingLinks"].set(linkId, "Link name is required");
          anyWorksheetsOrLinksInvalid = true;
        } else if (!isValidURL(link.url)) {
          newFormErrors["existingLinks"].set(linkId, "Link URL is invalid");
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
   * Runs when existing worksheet input field is blurred (clicked away from).
   *
   * @param worksheetId numerical ID of worksheet
   */
  function handleBlurExistingWorksheet(worksheetId: number) {
    const updatedExistingWorksheets = new Set(touched.existingWorksheets);
    updatedExistingWorksheets.add(worksheetId);
    setTouched({ ..._.merge(touched, { existingWorksheets: updatedExistingWorksheets }) });
  }

  /**
   * Runs when new worksheet input field is blurred (clicked away from).
   *
   * @param index position of worksheet in resource's worksheet array
   */
  function handleBlurNewWorksheet(index: number) {
    const updatedNewWorksheets = new Set(touched.newWorksheets);
    updatedNewWorksheets.add(index);
    setTouched({ ..._.merge(touched, { newWorksheets: updatedNewWorksheets }) });
  }

  /**
   * Runs when existing link input field is blurred (clicked away from).
   *
   * @param linkId ID of link in existingLinkMap
   */
  function handleBlurExistingLink(linkId: number) {
    const updatedExistingLinks = new Set(touched.existingLinks);
    updatedExistingLinks.add(linkId);
    setTouched({ ..._.merge(touched, { existingLinks: updatedExistingLinks }) });
  }

  /**
   * Runs when new link input field is blurred (clicked away from).
   *
   * @param index position of worksheet in resource's newLinks array
   */
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

  /**
   * Retrieves a link from the link map,
   * and calls the callback function on the link.
   *
   * @param linkId Id of link to retrieve
   * @param callback function to call on retrieved link
   */
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

  /**
   * Modifies a specified link field of the current resource.
   *
   * @param e - onChange event
   * @param linkId - id of link that was changed
   * @param field - resource field to change
   * @param getFile - whether file should be retrieved
   */
  function handleExistingLinkChange(
    e: React.ChangeEvent<HTMLInputElement>,
    linkId: number,
    field: "name" | "url"
  ): void {
    retrieveAndExecuteLink(linkId, link => {
      if (field === "name") {
        link[field] = e.target.value;
      } else {
        link[field] = e.target.value;
      }
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

  /**
   * Sets 'deleted' attribute to true to mark the link as deleted.
   *
   * @param linkId id of link that was deleted
   */
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

  /**
   * Handles updating newly created links.
   *
   * @param e event object
   * @param index new link index in array
   * @param field changed field in link
   */
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

  /**
   * Removes the new link from the list.
   *
   * @param index index in newLinks
   */
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

  /**
   * Add a new empty link with null id to the local state.
   */
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
    [...existingLinkMap.values()].map(
      link =>
        !link.deleted && (
          <ResourceLinkEdit
            key={link.id}
            link={link}
            onChange={handleExistingLinkChange}
            onDelete={handleExistingLinkDelete}
            onBlur={() => handleBlurExistingLink(link.id)}
            formErrorsMap={formErrors.existingLinks}
          ></ResourceLinkEdit>
        )
    );

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

  const tabErrorDisplay = (
    <div className="resource-tab-error-text">
      <ExclamationCircle className="icon" /> Errors present in {isEditingLinks ? "worksheets" : "links"}
    </div>
  );

  return (
    <Modal closeModal={onCancel} className="resource-edit-modal">
      <div className="resource-edit-container">
        <div id="resource-edit-inner">
          <div className="resource-info-edit">
            <label className="form-label resource-edit-head-item">
              Week Number
              <input
                className="form-input"
                type="text"
                defaultValue={resource.weekNum}
                placeholder="Week Number"
                onChange={e => onChange(e, "weekNum")}
                onBlur={() => handleBlur("weekNum")}
              />
            </label>
            <div className="resource-validation-error">
              {formErrors.weekNum && <ExclamationCircle className="icon" />}
              {formErrors.weekNum}
            </div>
          </div>
          <div className="resource-info-edit">
            <label className="form-label resource-edit-head-item">
              Date
              <input
                className="form-date"
                type="date"
                defaultValue={resource.date}
                onChange={e => onChange(e, "date")}
                onBlur={() => handleBlur("date")}
              />
            </label>
            <div className="resource-validation-error">
              {formErrors.date && <ExclamationCircle className="icon" />}
              {formErrors.date}
            </div>
          </div>
          <div className="resource-info-edit">
            <label className="form-label resource-edit-head-item">
              Topics
              <div className="topics-tooltip-wrapper">
                <Tooltip
                  placement="bottom"
                  source={
                    <input
                      className="form-input"
                      type="text"
                      defaultValue={resource.topics}
                      placeholder="Topics"
                      onChange={e => onChange(e, "topics")}
                      onBlur={() => handleBlur("topics")}
                    />
                  }
                >
                  Topics should be delimited by semicolons
                </Tooltip>
              </div>
            </label>
            <div className="resource-validation-error">
              {formErrors.topics && <ExclamationCircle className="icon" />}
              {formErrors.topics}
            </div>
          </div>
        </div>
        <div className="tab-list">
          <button
            onClick={() => {
              setIsEditingLinks(false);
            }}
            className={`tab ${!isEditingLinks ? "active" : ""}`}
          >
            Edit Worksheets
          </button>
          <button
            onClick={() => {
              setIsEditingLinks(true);
            }}
            className={`tab ${isEditingLinks ? "active" : ""}`}
          >
            Edit Links
          </button>
        </div>
        <div className="resource-edit-content-wrapper">
          <div className="resource-edit-content">
            {!isEditingLinks && (
              <div className="resource-worksheet-container">
                {hasWorksheets && (
                  <div className="resource-worksheet-head">
                    <div className="resource-worksheet-head-item">Name</div>
                    <div className="resource-worksheet-head-item">Worksheet File</div>
                    <div className="resource-worksheet-head-item">Solution File</div>
                  </div>
                )}
                {existingWorksheetDisplay}
                {newWorksheetDisplay}
                <div className="resource-worksheet-actions-container">
                  <button onClick={handleAddWorksheet} className="secondary-btn">
                    <PlusIcon className="icon" />
                    Add Worksheet
                  </button>
                </div>
              </div>
            )}
            {isEditingLinks && (
              <div className="resource-worksheet-container">
                {hasLinks && (
                  <div className="resource-link-head">
                    <div className="resource-worksheet-head-item">Name</div>
                    <div className="resource-worksheet-head-item">URL</div>
                  </div>
                )}
                {existingLinkDisplay}
                {newLinkDisplay}
                <div className="resource-worksheet-actions-container">
                  <button onClick={handleAddLink} className="secondary-btn">
                    <PlusIcon className="icon" />
                    Add Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="resource-edit-footer">
          <button onClick={handleSubmit} className="primary-btn" disabled={!checkValid()}>
            <CheckCircle className="icon" id="save-icon" /> Save
          </button>
          {!(!isEditingLinks && formErrors["existingLinks"].size == 0 && formErrors["newLinks"].size == 0) &&
            !(isEditingLinks && formErrors["existingWorksheets"].size == 0 && formErrors["newWorksheets"].size == 0) &&
            tabErrorDisplay}
        </div>
      </div>
    </Modal>
  );
};

export default ResourceEdit;
