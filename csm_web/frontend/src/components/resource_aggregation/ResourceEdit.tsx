import React from "react";
import { ResourceEditProps } from "./ResourceTypes";

export const ResourceEdit = ({ resource, handleChange, handleFileChange, handleSubmit }: ResourceEditProps) => {
  return (
    <div className="resourceEditContainer">
      <div id="resourceEditInner">
        <div>
          <div className="resourceInfoEdit">
            <input type="text" defaultValue={resource.weekNum} onChange={e => handleChange(e, "weekNum")} />
          </div>
          <div className="resourceInfoEdit">
            <input type="date" defaultValue={resource.date} onChange={e => handleChange(e, "date")} />
          </div>
          <div className="resourceInfoEdit">
            <input type="text" defaultValue={resource.topics} onChange={e => handleChange(e, "topics")} />
          </div>
          <div className="resourceInfoEdit">
            <input type="text" defaultValue={resource.worksheetName} onChange={e => handleChange(e, "worksheetName")} />
          </div>
        </div>
        <div>
          <div className="resourceInfoEdit">
            <div>Worksheet File</div>
            <input className="fileUpload" type="file" onChange={e => handleFileChange(e, "worksheetFile")} />
          </div>
          <div className="resourceInfoEdit">
            <div>Solutions File</div>
            <input className="fileUpload" type="file" onChange={e => handleFileChange(e, "solutionFile")} />
          </div>
        </div>
      </div>
      <button onClick={handleSubmit} id="resourceButtonSubmit">
        SUBMIT
      </button>
    </div>
  );
  // TODO:add cancel button that discards changes and resets edit
};

export default ResourceEdit;
