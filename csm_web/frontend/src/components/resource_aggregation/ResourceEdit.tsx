import React, { ChangeEvent, MouseEvent, useState, useEffect, useReducer } from "react";

import Modal from "../Modal";
import { Tooltip } from "../Tooltip";
import ResourceLinkEdit from "./ResourceLinkEdit";
import {
  copyWorksheet,
  copyLink,
  Worksheet,
  Link,
  Resource,
  ResourceValidationField,
  ResourceKeys
} from "./ResourceTypes";
import ResourceWorksheetEdit from "./ResourceWorksheetEdit";

import {
  resourceFormErrorReducer,
  hasAnyErrors,
  emptyFormErrors,
  ResourceFormErrorActionType
} from "./reducers/resourceFormErrorReducer";
import { ResourceLinkActionType, ResourceLinkKind, resourceLinkReducer } from "./reducers/resourceLinkReducer";
import { resourceTouchedReducer, emptyTouched, ResourceTouchedActionType } from "./reducers/resourceTouchedReducer";
import {
  ResourceWorksheetActionType,
  ResourceWorksheetKind,
  resourceWorksheetReducer
} from "./reducers/resourceWorksheetReducer";
import { validateResources } from "./utils/validation";

import CheckCircle from "../../../static/frontend/img/check-circle-solid.svg";
import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";
import PlusIcon from "../../../static/frontend/img/plus.svg";

interface ResourceEditProps {
  resource: Resource;
  onChange: (
    e: ChangeEvent<HTMLInputElement>,
    field: ResourceKeys.weekNum | ResourceKeys.date | ResourceKeys.topics
  ) => void;
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
  // status of whether each input element has been touched by the user
  const [{ touched }, touchDispatch] = useReducer(resourceTouchedReducer, {
    touched: emptyTouched()
  });

  // data structure containing all validation errors present
  const [{ formErrors }, formErrorDispatch] = useReducer(resourceFormErrorReducer, {
    formErrors: emptyFormErrors()
  });

  const [isEditingLinks, setIsEditingLinks] = useState<boolean>(false);

  const resourceWorksheetMap: Map<number, Worksheet> = new Map();
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

  // all worksheets, grouped by whether the worksheet was existing or if it's new
  const [{ existingWorksheets, newWorksheets }, worksheetDispatch] = useReducer(resourceWorksheetReducer, {
    existingWorksheets: resourceWorksheetMap,
    newWorksheets: []
  });

  // all links, grouped by whether the worksheet was existing or if it's new
  const [{ existingLinks, newLinks }, linkDispatch] = useReducer(resourceLinkReducer, {
    existingLinks: resourceLinkMap,
    newLinks: []
  });

  /**
   * If any input element was touched, re-validate.
   */
  useEffect(() => {
    validateResources({
      resource,
      newWorksheets,
      existingWorksheets,
      newLinks,
      existingLinks,
      touched,
      formErrorDispatch
    });
  }, [touched]);

  /**
   * Wrapper for the onSubmit function, validating all fields before submission.
   *
   * @param e - onSubmit event
   */
  function handleSubmit(e: MouseEvent<HTMLButtonElement>) {
    // validate all fields
    const fieldsValid = validateResources({
      resource,
      newWorksheets,
      existingWorksheets,
      newLinks,
      existingLinks,
      touched,
      formErrorDispatch,
      validateAll: true
    });

    if (fieldsValid) {
      onSubmit(e, existingWorksheets, existingLinks, newWorksheets, newLinks);
    }
  }

  /**
   * Mark a worksheet/link as deleted, and update `touched` and `formErrors`.
   *
   * @param kind - item in either `ResourceWorksheetKind` or `ResourceLinkKind`, indicating what item should be deleted
   * @param id - ID of the item to be deleted
   */
  function handleDelete(kind: ResourceWorksheetKind | ResourceLinkKind, id: number): void {
    let field: ResourceValidationField;
    // here, we need to ensure that ResourceWorksheetKind and ResourceLinkKind have distinct values;
    // the default integer enum assigns the same 0/1 values to these enums
    switch (kind) {
      case ResourceWorksheetKind.NEW:
        field = ResourceValidationField.newWorksheets;
        break;
      case ResourceWorksheetKind.EXISTING:
        field = ResourceValidationField.existingWorksheets;
        break;
      case ResourceLinkKind.NEW:
        field = ResourceValidationField.newLinks;
        break;
      case ResourceLinkKind.EXISTING:
        field = ResourceValidationField.existingLinks;
        break;
    }

    formErrorDispatch({
      type: ResourceFormErrorActionType.DeleteError,
      field,
      id,
      deletedResource: true
    });
    touchDispatch({
      type: ResourceTouchedActionType.DeleteTouched,
      field,
      id,
      deletedResource: true
    });

    switch (kind) {
      case ResourceWorksheetKind.NEW:
      case ResourceWorksheetKind.EXISTING:
        worksheetDispatch({
          type: ResourceWorksheetActionType.DeleteWorksheet,
          worksheetId: id,
          kind
        });
        break;
      case ResourceLinkKind.NEW:
      case ResourceLinkKind.EXISTING:
        linkDispatch({
          type: ResourceLinkActionType.DeleteLink,
          linkId: id,
          kind
        });
        break;
    }
  }

  const existingWorksheetDisplay =
    existingWorksheets &&
    [...existingWorksheets.values()].map(worksheet =>
      worksheet.deleted && worksheet.deleted.includes("worksheet") ? undefined : (
        <ResourceWorksheetEdit
          key={worksheet.id}
          worksheet={worksheet}
          worksheetKind={ResourceWorksheetKind.EXISTING}
          worksheetDispatch={worksheetDispatch}
          onDelete={() => handleDelete(ResourceWorksheetKind.EXISTING, worksheet.id)}
          onBlur={() =>
            touchDispatch({
              type: ResourceTouchedActionType.SetTouched,
              field: ResourceValidationField.existingWorksheets,
              id: worksheet.id
            })
          }
          formErrorsMap={formErrors.existingWorksheets}
        ></ResourceWorksheetEdit>
      )
    );

  const existingLinkDisplay =
    existingLinks &&
    [...existingLinks.values()].map(
      link =>
        !link.deleted && (
          <ResourceLinkEdit
            key={link.id}
            link={link}
            linkKind={ResourceLinkKind.EXISTING}
            linkDispatch={linkDispatch}
            onDelete={() => handleDelete(ResourceLinkKind.EXISTING, link.id)}
            onBlur={() =>
              touchDispatch({
                type: ResourceTouchedActionType.SetTouched,
                field: ResourceValidationField.existingLinks,
                id: link.id
              })
            }
            formErrorsMap={formErrors.existingLinks}
          ></ResourceLinkEdit>
        )
    );

  const newWorksheetDisplay =
    newWorksheets &&
    newWorksheets.map((worksheet, index) => (
      <ResourceWorksheetEdit
        key={worksheet.id}
        worksheet={worksheet}
        worksheetKind={ResourceWorksheetKind.NEW}
        worksheetDispatch={worksheetDispatch}
        index={index}
        onDelete={() => handleDelete(ResourceWorksheetKind.NEW, index)}
        onBlur={() =>
          touchDispatch({
            type: ResourceTouchedActionType.SetTouched,
            field: ResourceValidationField.newWorksheets,
            id: index
          })
        }
        formErrorsMap={formErrors.newWorksheets}
      ></ResourceWorksheetEdit>
    ));

  const newLinkDisplay =
    newLinks &&
    newLinks.map((link, index) => (
      <ResourceLinkEdit
        key={link.id}
        index={index}
        link={link}
        linkKind={ResourceLinkKind.NEW}
        linkDispatch={linkDispatch}
        onDelete={() => handleDelete(ResourceLinkKind.NEW, index)}
        onBlur={() =>
          touchDispatch({
            type: ResourceTouchedActionType.SetTouched,
            field: ResourceValidationField.newLinks,
            id: index
          })
        }
        formErrorsMap={formErrors.newLinks}
      ></ResourceLinkEdit>
    ));

  const hasLinks = existingLinks && newLinks && (existingLinkDisplay.length > 0 || newLinkDisplay.length > 0);

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
                type="number"
                min={0}
                defaultValue={isNaN(resource.weekNum) ? "" : resource.weekNum}
                placeholder="Week Number"
                onChange={e => onChange(e, ResourceKeys.weekNum)}
                onBlur={() =>
                  touchDispatch({ type: ResourceTouchedActionType.SetTouched, field: ResourceValidationField.weekNum })
                }
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
                onChange={e => onChange(e, ResourceKeys.date)}
                onBlur={() =>
                  touchDispatch({ type: ResourceTouchedActionType.SetTouched, field: ResourceValidationField.date })
                }
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
                      onChange={e => onChange(e, ResourceKeys.topics)}
                      onBlur={() =>
                        touchDispatch({
                          type: ResourceTouchedActionType.SetTouched,
                          field: ResourceValidationField.topics
                        })
                      }
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
                {existingWorksheetDisplay}
                {newWorksheetDisplay}
                <div className="resource-worksheet-actions-container">
                  <button
                    onClick={() => worksheetDispatch({ type: ResourceWorksheetActionType.AddWorksheet })}
                    className="secondary-btn"
                  >
                    <PlusIcon className="icon" />
                    Add Worksheet
                  </button>
                </div>
              </div>
            )}
            {isEditingLinks && (
              <div className="resource-link-container">
                {hasLinks && (
                  <div className="resource-link-head">
                    <div className="resource-link-head-item">{/* empty for delete icon */}</div>
                    <div className="resource-link-head-item">Name</div>
                    <div className="resource-link-head-item">URL</div>
                  </div>
                )}
                {existingLinkDisplay}
                {newLinkDisplay}
                <div className="resource-link-actions-container">
                  <button
                    onClick={() => linkDispatch({ type: ResourceLinkActionType.AddLink })}
                    className="secondary-btn"
                  >
                    <PlusIcon className="icon" />
                    Add Link
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="resource-edit-footer">
          {!(!isEditingLinks && formErrors["existingLinks"].size == 0 && formErrors["newLinks"].size == 0) &&
            !(isEditingLinks && formErrors["existingWorksheets"].size == 0 && formErrors["newWorksheets"].size == 0) &&
            tabErrorDisplay}
          <button onClick={handleSubmit} className="primary-btn" disabled={hasAnyErrors(formErrors)}>
            <CheckCircle className="icon" id="save-icon" /> Save
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ResourceEdit;
