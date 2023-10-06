import React from "react";
import { Worksheet } from "./ResourceTypes";

import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";
import Upload from "../../../static/frontend/img/upload.svg";
import Times from "../../../static/frontend/img/x.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";

interface ResourceFileFieldProps {
  worksheet: Worksheet;
  fileType: "worksheetFile" | "solutionFile";
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Helper component for a file field, updating when the user uploads/deletes files.
 */
const ResourceFileField = ({ worksheet, fileType, onChange, onDelete }: ResourceFileFieldProps) => {
  const isDeleted = worksheet.deleted && worksheet.deleted.includes(fileType);
  let uploadLabel = "Upload File";
  if (worksheet[fileType] && !isDeleted) {
    if (typeof worksheet[fileType] === "string") {
      // already uploaded to S3; parse filename/type from URL
      uploadLabel = (worksheet[fileType] as string).split("#").shift()!.split("?").shift()!.split("/").pop()!;
    } else {
      // newly uplaoded; name is in File object
      uploadLabel = (worksheet[fileType] as File).name;
    }
  }
  return (
    <div className="resource-worksheet-edit-file">
      <label className="file-upload">
        <input type="file" onChange={onChange} />
        <Upload className="icon upload-icon" />
        <span className="file-upload-label">{uploadLabel}</span>
      </label>
      {worksheet[fileType] && !isDeleted && (
        <button onClick={onDelete} className="clear-file">
          <Times className="icon" />
        </button>
      )}
    </div>
  );
};

interface ResourceWorksheetEditProps {
  worksheet: Worksheet;
  onChange: (
    e: React.ChangeEvent<HTMLInputElement>,
    worksheetId: number,
    field: "worksheetFile" | "solutionFile" | "name",
    getFile?: boolean
  ) => void;
  onDelete: (worksheetId: number) => void;
  onDeleteFile: (worksheetId: number, field: "worksheetFile" | "solutionFile") => void;
  onBlur: () => void;
  formErrorsMap: Map<number, string>;
  index: number;
}

const ResourceWorksheetEdit = ({
  worksheet,
  onChange,
  onDelete,
  onDeleteFile,
  onBlur,
  formErrorsMap,
  index
}: ResourceWorksheetEditProps): React.ReactElement => {
  const currentId = index == undefined ? worksheet.id : index;
  return (
    <div className="resource-worksheet">
      <div className="resource-worksheet-edit-item">
        <input
          className="form-input"
          type="text"
          defaultValue={worksheet.name}
          placeholder="Worksheet Name"
          onChange={e => onChange(e, currentId, "name")}
          onBlur={() => onBlur()}
        />
        <div className="resource-validation-error">
          {formErrorsMap.get(currentId) && <ExclamationCircle className="icon" />}
          {formErrorsMap.get(currentId)}
        </div>
      </div>
      <ResourceFileField
        worksheet={worksheet}
        fileType="worksheetFile"
        onChange={e => onChange(e, currentId, "worksheetFile", true)}
        onDelete={() => onDeleteFile(currentId, "worksheetFile")}
      />
      <ResourceFileField
        worksheet={worksheet}
        fileType="solutionFile"
        onChange={e => onChange(e, currentId, "solutionFile", true)}
        onDelete={() => onDeleteFile(currentId, "solutionFile")}
      />
      <button onClick={() => onDelete(currentId)} className="delete-worksheet">
        <Trash className="icon" />
      </button>
    </div>
  );
};

ResourceWorksheetEdit.defaultProps = {
  index: undefined
};

export default ResourceWorksheetEdit;
