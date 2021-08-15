import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faCheckCircle } from "@fortawesome/free-solid-svg-icons";

/**
 * TODO: currently, the ternary for "re-upload file" vs "upload file"
 * does not update when a file has just been uploaded locally.
 */
const ResourceFileField = ({ file, title, onChange }) => (
  <div className="resourceInfoEdit">
    <div>{title}</div>
    <label className="fileUpload">
      <input type="file" onChange={onChange} />
      <FontAwesomeIcon icon={faUpload} className="uploadIcon" />
      {file ? "Re-upload File" : "Upload File"}
    </label>
  </div>
);

const ResourceWorksheetEdit = ({ worksheet, onChange, onDelete, index }) => {
  // TODO: rename the delete button/restyle, and group these worksheet edit items better
  return (
    <div>
      <div className="resourceInfoEdit">
        <input
          type="text"
          defaultValue={worksheet.name}
          placeholder="Worksheet Name"
          onChange={e => onChange(e, index == undefined ? worksheet.id : index, "name")}
        />
      </div>
      <ResourceFileField
        file={worksheet.worksheetFile}
        title={"Worksheet File"}
        onChange={e => onChange(e, index == undefined ? worksheet.id : index, "worksheetFile", true)}
      />
      <ResourceFileField
        file={worksheet.solutionFile}
        title={"Solutions File"}
        onChange={e => onChange(e, index == undefined ? worksheet.id : index, "solutionFile", true)}
      />
      <button onClick={e => onDelete(e, index == undefined ? worksheet.id : index)}>Delete above</button>
    </div>
  );
};

ResourceWorksheetEdit.defaultProps = {
  index: undefined
};

export default ResourceWorksheetEdit;
