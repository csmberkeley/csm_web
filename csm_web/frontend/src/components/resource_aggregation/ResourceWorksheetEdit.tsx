import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faExclamationCircle, faTimes, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import { Worksheet } from "./ResourceTypes";

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
    <div className="resourceWorksheetEditFile">
      <label className="fileUpload">
        <input type="file" onChange={onChange} />
        <FontAwesomeIcon icon={faUpload} className="uploadIcon" />
        <span className="fileUploadLabel">{uploadLabel}</span>
      </label>
      {worksheet[fileType] && !isDeleted && (
        <button onClick={onDelete} className="clearFile">
          <FontAwesomeIcon icon={faTimes} />
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
    <div className="resourceWorksheet">
      <div className="resourceWorksheetEditItem">
        <input
          type="text"
          defaultValue={worksheet.name}
          placeholder="Worksheet Name"
          onChange={e => onChange(e, currentId, "name")}
          onBlur={() => onBlur()}
        />
        <div className="resourceValidationError">
          {formErrorsMap.get(currentId) && <FontAwesomeIcon icon={faExclamationCircle} className="exclamationIcon" />}
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
      <button onClick={() => onDelete(currentId)} className="deleteWorksheet">
        <FontAwesomeIcon icon={faTrashAlt} />
      </button>
    </div>
  );
};

ResourceWorksheetEdit.defaultProps = {
  index: undefined
};

export default ResourceWorksheetEdit;
