import React, { Dispatch, useRef } from "react";

import { formatForDatetimeInput } from "../../utils/datetime";
import { Worksheet, WorksheetKeys } from "./ResourceTypes";
import { ResourceWorksheetActionType, ResourceWorksheetKind, ResourceWorksheetReducerAction } from "./utils";

import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";
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
  /**
   * ID for the current worksheet on the page, used for HTML input label associations.
   */
  htmlWorksheetId: string;
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
  htmlWorksheetId
}: ResourceFileFieldProps) => {
  const fileScheduleRef = useRef<HTMLInputElement>(null);

  const isDeleted = worksheet.deleted && worksheet.deleted.includes(fileType);
  let uploadFilename = "Upload File";
  if (worksheet[fileType] && !isDeleted) {
    if (typeof worksheet[fileType] === "string") {
      // already uploaded to S3; parse filename/type from URL
      uploadFilename = (worksheet[fileType] as string).split("#").shift()!.split("?").shift()!.split("/").pop()!;
    } else {
      // newly uplaoded; name is in File object
      uploadFilename = (worksheet[fileType] as File).name;
    }
  }

  let inputLabel = "";
  let curSchedule: string | null = null;
  if (fileType === WorksheetKeys.worksheetFile) {
    inputLabel = "Worksheet file";
    curSchedule = worksheet.worksheetSchedule;
  } else if (fileType === WorksheetKeys.solutionFile) {
    inputLabel = "Solution file";
    curSchedule = worksheet.solutionSchedule;
  } else {
    console.error("Invalid worksheet type");
  }

  // format schedule for use in the datetime-local input
  if (curSchedule != null && curSchedule.length > 0) {
    curSchedule = formatForDatetimeInput(curSchedule);
  }

  const fileUploadHtmlId = `${htmlWorksheetId}-${fileType}`;

  return (
    <div className="resource-worksheet-edit-file">
      <div className="form-label resource-worksheet-edit-file-upload">
        <label htmlFor={`${fileUploadHtmlId}-upload`}>{inputLabel}</label>
        <div className="file-upload">
          <input id={`${fileUploadHtmlId}-upload`} type="file" onChange={e => onFileChange(e.target.files!)} />
          <label htmlFor={`${fileUploadHtmlId}-upload`} className="file-upload-text">
            <Upload className="icon upload-icon" />
            <span className="file-upload-filename">{uploadFilename}</span>
          </label>
          {worksheet[fileType] && !isDeleted && (
            <button onClick={onDelete} className="clear-file">
              <Times className="icon" />
            </button>
          )}
        </div>
      </div>
      <div className="resource-worksheet-edit-file-schedule">
        <label className="file-schedule-toggle">
          <input
            className="form-input form-checkbox"
            type="checkbox"
            checked={curSchedule != null}
            onChange={e => {
              if (!e.target.checked && fileScheduleRef.current) {
                // clear schedule date input if the user unchecks the box
                fileScheduleRef.current.value = "";
              }

              onScheduleToggle(e.target.checked);
            }}
          />
        </label>
        <label className={`form-label ${curSchedule == null ? "disabled" : ""}`}>
          Schedule
          <div className="file-schedule">
            <input
              ref={fileScheduleRef}
              type="datetime-local"
              className="form-input file-schedule-input"
              disabled={curSchedule == null}
              value={curSchedule || ""}
              onChange={e => onScheduleChange(e.target.value)}
            />
          </div>
        </label>
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
  formErrorsMap: Map<number, string>;
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
          {formErrorsMap.get(currentId) && <ExclamationCircle className="icon" />}
          {formErrorsMap.get(currentId)}
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
        />
        <ResourceFileField
          worksheet={worksheet}
          htmlWorksheetId={htmlId}
          fileType={WorksheetKeys.solutionFile}
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
        />
      </div>
    </div>
  );
};

export default ResourceWorksheetEdit;
