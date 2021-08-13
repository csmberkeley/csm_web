import React, { useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUpload, faCheckCircle } from '@fortawesome/free-solid-svg-icons'


const ResourceWorksheetEdit = ({worksheet, onChange}) => {
    const ResourceFileField = (file, fileType) => (
        <div className="resourceInfoEdit">
            <div>{fileType}</div>
            <label className="fileUpload">
            <input type="file"/>
            <FontAwesomeIcon icon={faUpload} className="uploadIcon" />
            {file ? "Upload File" : "Re-upload File"}
            </label>
        </div>
    );

    return (
        <div key={worksheet.id}>
            <div className="resourceInfoEdit">
                <input type="text" defaultValue={worksheet.name} placeholder="Worksheet Name" onChange={e => onChange(e, "worksheetName")} />
            </div>
            <ResourceFileField file={worksheet.worksheetFile} fileType={"Worksheet File"}/>
            <ResourceFileField file={worksheet.solutionFile} fileType={"Solutions File"}/>
        </div>
    )
}

export default ResourceWorksheetEdit;