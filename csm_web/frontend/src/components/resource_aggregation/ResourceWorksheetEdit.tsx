import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faExclamationCircle, faCheckCircle } from "@fortawesome/free-solid-svg-icons";

/**
 * Helper component for a file field, updating when the user uploads/deletes files.
 */
const ResourceFileField = ({ worksheet, fileType, title, onChange, onDelete }) => {
  return (
    <div className="resourceInfoEdit">
      <div>{title}</div>
      <label className="fileUpload">
        <input type="file" onChange={onChange} />
        <FontAwesomeIcon icon={faUpload} className="uploadIcon" />
        {worksheet[fileType] && !(worksheet.deleted && worksheet.deleted.includes(fileType))
          ? "Re-upload File"
          : "Upload File"}
      </label>
      <button onClick={onDelete}>X</button>
    </div>
  );
};

const ResourceWorksheetEdit = ({ worksheet, onChange, onDelete, onDeleteFile, onBlur, formErrorsMap, index }) => {
  let currentId = index == undefined ? worksheet.id : index;
  // TODO: rename the delete button/restyle, and group these worksheet edit items better
  return (
    <div>
      <div className="resourceInfoEdit">
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
        title={"Worksheet File"}
        onChange={e => onChange(e, currentId, "worksheetFile", true)}
        onDelete={e => onDeleteFile(e, currentId, "worksheetFile")}
      />
      <ResourceFileField
        worksheet={worksheet}
        fileType="solutionFile"
        title={"Solutions File"}
        onChange={e => onChange(e, currentId, "solutionFile", true)}
        onDelete={e => onDeleteFile(e, currentId, "solutionFile")}
      />
      <button onClick={e => onDelete(e, currentId)}>Delete above</button>
    </div>
  );
};

ResourceWorksheetEdit.defaultProps = {
  index: undefined
};

export default ResourceWorksheetEdit;
