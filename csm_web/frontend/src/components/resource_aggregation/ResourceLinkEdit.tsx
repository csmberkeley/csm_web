import React, { Dispatch } from "react";

import { Link, LinkKeys } from "./ResourceTypes";
import { LinkError } from "./reducers/resourceFormErrorReducer";
import { ResourceLinkActionType, ResourceLinkKind, ResourceLinkReducerAction } from "./reducers/resourceLinkReducer";

import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";

interface ResourceLinkEditProps {
  link: Link;
  linkKind: ResourceLinkKind;
  linkDispatch: Dispatch<ResourceLinkReducerAction>;
  onBlur: () => void;
  onDelete: (id: number) => void;
  formErrorsMap: Map<number, LinkError>;
  index?: number;
}

const ResourceLinkEdit = ({
  link,
  linkKind,
  linkDispatch,
  onBlur,
  onDelete,
  formErrorsMap,
  index = undefined
}: ResourceLinkEditProps): React.ReactElement => {
  const currentId = index == undefined ? link.id : index;

  const curErrors = formErrorsMap.get(currentId);

  return (
    <React.Fragment>
      <div className="resource-link-edit">
        <button onClick={() => onDelete(currentId)} className="delete-link">
          <Trash className="icon" />
        </button>
        <div className="resource-link-edit-item">
          <input
            className="form-input"
            type="text"
            defaultValue={link.name}
            placeholder="Link Name"
            onChange={e =>
              linkDispatch({
                type: ResourceLinkActionType.UpdateField,
                kind: linkKind,
                field: LinkKeys.name,
                linkId: currentId,
                value: e.target.value
              })
            }
            onBlur={() => onBlur()}
          />
          <div className="resource-validation-error">
            {curErrors?.name && <ExclamationCircle className="icon" />}
            {curErrors?.name}
          </div>
        </div>
        <div className="resource-link-edit-item">
          <input
            className="form-input"
            type="text"
            defaultValue={link.url}
            placeholder="Link URL"
            onChange={e =>
              linkDispatch({
                type: ResourceLinkActionType.UpdateField,
                kind: linkKind,
                field: LinkKeys.url,
                linkId: currentId,
                value: e.target.value
              })
            }
            onBlur={() => onBlur()}
          />
          <div className="resource-validation-error">
            {curErrors?.url && <ExclamationCircle className="icon" />}
            {curErrors?.url}
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default ResourceLinkEdit;
