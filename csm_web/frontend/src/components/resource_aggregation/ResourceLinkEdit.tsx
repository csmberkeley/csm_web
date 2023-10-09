import React from "react";

import { Link } from "./ResourceTypes";

import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";

interface ResourceLinkEditProps {
  link: Link;
  onChange: (e: React.ChangeEvent<HTMLInputElement>, linkId: number, field: "name" | "url") => void;
  onBlur: () => void;
  onDelete: (id: number) => void;
  formErrorsMap: Map<number, string>;
  index: number;
}

const ResourceLinkEdit = ({
  link,
  onChange,
  onBlur,
  onDelete,
  formErrorsMap,
  index
}: ResourceLinkEditProps): React.ReactElement => {
  const currentId = index == undefined ? link.id : index;
  return (
    <React.Fragment>
      <div className="resource-link-edit">
        <input
          className="form-input"
          type="text"
          defaultValue={link.name}
          placeholder="Link Name"
          onChange={e => onChange(e, currentId, "name")}
          onBlur={() => onBlur()}
        />
        <input
          className="form-input"
          type="text"
          defaultValue={link.url}
          placeholder="Link URL"
          onChange={e => onChange(e, currentId, "url")}
          onBlur={() => onBlur()}
        />

        <button onClick={() => onDelete(currentId)} className="delete-worksheet">
          <Trash className="icon" />
        </button>
      </div>
      <div className="resource-validation-error">
        {formErrorsMap.get(currentId) && <ExclamationCircle className="icon" />}
        {formErrorsMap.get(currentId)}
      </div>
    </React.Fragment>
  );
};

ResourceLinkEdit.defaultProps = {
  index: undefined
};

export default ResourceLinkEdit;
