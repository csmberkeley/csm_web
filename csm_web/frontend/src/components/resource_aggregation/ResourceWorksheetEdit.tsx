import React, { Dispatch, useRef } from "react";

import { formatForDatetimeInput } from "../../utils/datetime";
import { Worksheet, checkWorksheetFile, WorksheetKeys } from "./ResourceTypes";

import { WorksheetError } from "./reducers/resourceFormErrorReducer";
import {
  ResourceWorksheetActionType,
  ResourceWorksheetKind,
  ResourceWorksheetReducerAction
} from "./reducers/resourceWorksheetReducer";

import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";
import LinkIcon from "../../../static/frontend/img/link.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";
import Upload from "../../../static/frontend/img/upload.svg";
import Times from "../../../static/frontend/img/x.svg";

interface ResourceFileFieldProps {
  worksheet: Worksheet;
  fileType: WorksheetKeys.worksheetFile | WorksheetKeys.solutionFile;
  onFileChange: (files: FileList) => void;
  onScheduleChange: (value: string) => void;
  onScheduleToggle: (enabled: boolean) => void;
  onDelete: React.MouseEventHandler<HTMLButtonElement>;
  onBlur: () => void;
  errors: WorksheetError | undefined;
  /**
   * ID for the current worksheet on the page, used for HTML input label associations.
   */
  htmlWorksheetId: string;
  /**
   * Whether the file input field should be disabled
   */
  disabled?: boolean;
}

/**
 * Helper component for a file field, updating when the user uploads/deletes files.
 *
 * To correctly associate labels with form inputs, an ID needs to be generated for this file field.
 * The `htmlWorksheetId` is used as a prefix, and the `fileType` is also used to differentiate between
 * worksheet files and solution files.
 */
const ResourceFileField = ({
  worksheet,
  fileType,
  onFileChange,
  onScheduleChange,
  onScheduleToggle,
  onDelete,
  onBlur,
  errors,
  htmlWorksheetId,
  disabled = false
}: ResourceFileFieldProps) => {
  const fileScheduleRef = useRef<HTMLInputElement>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    if (fileUploadRef.current) {
      fileUploadRef.current.value = "";
    }
    onDelete(e);
  }

  // unique ID (on the page) for the file upload
  const fileUploadHtmlId = `${htmlWorksheetId}-${fileType}`;

  const isDeleted = worksheet.deleted && worksheet.deleted.includes(fileType);
  const hasFile = worksheet[fileType] && !isDeleted;
  const hasFileLink = hasFile && typeof worksheet[fileType] === "string";

  let fileElement;
  if (hasFile && hasFileLink) {
    // display a link to the file instead of an upload input

    // already uploaded to S3; parse filename/type from URL
    const uploadLink = worksheet[fileType] as string;
    const uploadFilename = uploadLink.split("#").shift()!.split("?").shift()!.split("/").pop()!;

    fileElement = (
      <a className="file-upload-text" href={uploadLink} target="_blank" rel="noreferrer">
        <LinkIcon className="icon link-icon" />
        {uploadFilename}
      </a>
    );
  } else {
    // display an input field
    let uploadFilename = "Upload File";
    if (hasFile) {
      // if the user has newly uploaded a file, display the filename
      uploadFilename = (worksheet[fileType] as File).name;
    }

    fileElement = (
      <>
        <input
          id={`${fileUploadHtmlId}-upload`}
          type="file"
          onChange={e => onFileChange(e.target.files!)}
          disabled={disabled}
          ref={fileUploadRef}
        />
        <label htmlFor={`${fileUploadHtmlId}-upload`} className="file-upload-text">
          <Upload className="icon upload-icon" />
          <span className="file-upload-filename">{uploadFilename}</span>
        </label>
      </>
    );
  }

  let inputLabel = "";
  let scheduleKey: WorksheetKeys.worksheetSchedule | WorksheetKeys.solutionSchedule;
  if (fileType === WorksheetKeys.worksheetFile) {
    inputLabel = "Worksheet file";
    scheduleKey = WorksheetKeys.worksheetSchedule;
  } else if (fileType === WorksheetKeys.solutionFile) {
    inputLabel = "Solution file";
    scheduleKey = WorksheetKeys.solutionSchedule;
  } else {
    throw new Error("Internal error: invalid worksheet type provided");
  }

  let curSchedule = worksheet[scheduleKey];
  const curScheduleError = errors ? errors[scheduleKey] : null;
  const curFileError = errors ? errors[fileType] : null;

  // format schedule for use in the datetime-local input
  if (curSchedule != null && curSchedule.length > 0) {
    curSchedule = formatForDatetimeInput(curSchedule);
  }

  const scheduleDisabled = disabled || curSchedule == null;

  return (
    <div className="resource-worksheet-edit-file">
      <div className="resource-worksheet-edit-file-upload-container">
        <div className={`form-label resource-worksheet-edit-file-upload `}>
          <label className={disabled ? "disabled" : ""} htmlFor={`${fileUploadHtmlId}-upload`}>
            {inputLabel}
          </label>
          <div className={`file-upload ${disabled ? "disabled" : ""}`}>
            {fileElement}
            {hasFile && (
              <button onClick={handleDelete} className="clear-file">
                <Times className="icon" />
              </button>
            )}
          </div>
        </div>
        <div className="resource-validation-error">
          {curFileError && <ExclamationCircle className="icon" />}
          {curFileError}
        </div>
      </div>
      <div className="resource-worksheet-edit-file-schedule-container">
        <div className="resource-worksheet-edit-file-schedule">
          <label className="file-schedule-toggle">
            <input
              className="form-input form-checkbox"
              type="checkbox"
              checked={curSchedule != null}
              disabled={!hasFile}
              onChange={e => {
                if (!e.target.checked && fileScheduleRef.current) {
                  // clear schedule date input if the user unchecks the box
                  fileScheduleRef.current.value = "";

                  // only call blur to update error validation
                  // if the checkbox is unchecked (i.e. the user disabled the schedule);
                  // otherwise, the date will always be empty anyways
                  onBlur();
                }

                onScheduleToggle(e.target.checked);
              }}
            />
          </label>
          <label className={`form-label file-schedule-label ${scheduleDisabled ? "disabled" : ""}`}>
            Schedule
            <div className="file-schedule">
              <input
                ref={fileScheduleRef}
                type="datetime-local"
                className="form-input file-schedule-input"
                disabled={scheduleDisabled}
                value={curSchedule || ""}
                onChange={e => {
                  onScheduleChange(e.target.value);
                  // also trigger blur here, to allow for more responsive updates of the validation error
                  onBlur();
                }}
                onBlur={onBlur}
              />
            </div>
          </label>
        </div>
        <div className="resource-validation-error">
          {curScheduleError && <ExclamationCircle className="icon" />}
          {curScheduleError}
        </div>
      </div>
    </div>
  );
};

interface ResourceWorksheetEditProps {
  worksheet: Worksheet;
  worksheetKind: ResourceWorksheetKind;
  worksheetDispatch: Dispatch<ResourceWorksheetReducerAction>;
  onDelete: (worksheetId: number) => void;
  onBlur: () => void;
  formErrorsMap: Map<number, WorksheetError>;
  index?: number;
}

const ResourceWorksheetEdit = ({
  worksheet,
  worksheetKind,
  worksheetDispatch,
  onDelete,
  onBlur,
  formErrorsMap,
  index = undefined
}: ResourceWorksheetEditProps): React.ReactElement => {
  const currentId = index == undefined ? worksheet.id : index;

  /**
   * Some form fields require a unique ID in order to associate the label with the correct input.
   * This `htmlId` serves as the unique ID for the inputs; we assume that the tuple
   *    (worksheet, worksheetKind)
   * is a unique descriptor for this specific worksheet.
   */
  const htmlId = `worksheet-${currentId}-${worksheetKind}`;

  const curErrors = formErrorsMap.get(currentId);

  const hasWorksheetFile = checkWorksheetFile(worksheet, WorksheetKeys.worksheetFile);
  console.log({ id: worksheet.id, hasWorksheetFile });

  return (
    <div className="resource-worksheet-edit">
      <button onClick={() => onDelete(currentId)} className="delete-worksheet">
        <Trash className="icon" />
      </button>
      <div className="resource-worksheet-edit-item">
        <label className="form-label">
          Name
          <input
            className="form-input resource-worksheet-edit-name"
            type="text"
            defaultValue={worksheet.name}
            placeholder="Worksheet Name"
            onChange={e =>
              worksheetDispatch({
                type: ResourceWorksheetActionType.UpdateField,
                kind: worksheetKind,
                worksheetId: currentId,
                field: WorksheetKeys.name,
                value: e.target.value
              })
            }
            onBlur={() => onBlur()}
          />
        </label>
        <div className="resource-validation-error">
          {curErrors?.name && <ExclamationCircle className="icon" />}
          {curErrors?.name}
        </div>
      </div>
      <div className="resource-worksheet-edit-file-container">
        <ResourceFileField
          worksheet={worksheet}
          fileType={WorksheetKeys.worksheetFile}
          htmlWorksheetId={htmlId}
          onFileChange={files =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.UpdateField,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.worksheetFile,
              value: files
            })
          }
          onDelete={() =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.DeleteFile,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.worksheetFile
            })
          }
          onScheduleChange={value =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.UpdateField,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.worksheetSchedule,
              value
            })
          }
          onScheduleToggle={enabled =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.UpdateField,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.worksheetSchedule,
              // if the box is newly checked, the schedule value should be cleared and set to the empty string
              value: enabled ? "" : null
            })
          }
          onBlur={onBlur}
          errors={curErrors}
        />
        <ResourceFileField
          worksheet={worksheet}
          htmlWorksheetId={htmlId}
          fileType={WorksheetKeys.solutionFile}
          disabled={!hasWorksheetFile}
          onFileChange={files =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.UpdateField,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.solutionFile,
              value: files
            })
          }
          onDelete={() =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.DeleteFile,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.solutionFile
            })
          }
          onScheduleChange={value =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.UpdateField,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.solutionSchedule,
              value
            })
          }
          onScheduleToggle={enabled =>
            worksheetDispatch({
              type: ResourceWorksheetActionType.UpdateField,
              kind: worksheetKind,
              worksheetId: currentId,
              field: WorksheetKeys.solutionSchedule,
              // if the box is newly checked, the schedule value should be cleared and set to the empty string
              value: enabled ? "" : null
            })
          }
          onBlur={onBlur}
          errors={curErrors}
        />
      </div>
    </div>
  );
};

export default ResourceWorksheetEdit;
