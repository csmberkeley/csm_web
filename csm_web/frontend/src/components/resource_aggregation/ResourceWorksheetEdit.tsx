import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faExclamationCircle, faTimes, faTrashAlt } from "@fortawesome/free-solid-svg-icons";

/**
 * Helper component for a file field, updating when the user uploads/deletes files.
 */
const ResourceFileField = ({ worksheet, fileType, onChange, onDelete }) => {
  const isDeleted = worksheet.deleted && worksheet.deleted.includes(fileType);
  let uploadLabel = "Upload File";
  if (worksheet[fileType] && !isDeleted) {
    if (typeof worksheet[fileType] === "string") {
      // already uploaded to S3; parse filename/type from URL
      uploadLabel = worksheet[fileType].split("#").shift().split("?").shift().split("/").pop();
    } else {
      // newly uplaoded; name is in File object
      uploadLabel = worksheet[fileType].name;
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

const ResourceWorksheetEdit = ({ worksheet, onChange, onDelete, onDeleteFile, onBlur, formErrorsMap, index }) => {
  let currentId = index == undefined ? worksheet.id : index;
  // TODO: rename the delete button/restyle, and group these worksheet edit items better
  return (
    <div className="resourceWorksheet">
      <div className="resourceWorksheetEditItem">
        <input
          type="text"
          defaultValue={worksheet.name}
          placeholder="Worksheet Name"
          onChange={e => onChange(e, currentId, "name")}
          onBlur={e => onBlur(e)}
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
        onDelete={e => onDeleteFile(e, currentId, "worksheetFile")}
      />
      <ResourceFileField
        worksheet={worksheet}
        fileType="solutionFile"
        onChange={e => onChange(e, currentId, "solutionFile", true)}
        onDelete={e => onDeleteFile(e, currentId, "solutionFile")}
      />
      <button onClick={e => onDelete(e, currentId)} className="deleteWorksheet">
        <FontAwesomeIcon icon={faTrashAlt} />
      </button>
    </div>
  );
};

ResourceWorksheetEdit.defaultProps = {
  index: undefined
};

export default ResourceWorksheetEdit;
