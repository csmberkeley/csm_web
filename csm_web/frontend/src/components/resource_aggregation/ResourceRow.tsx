import React, { useState, useEffect, ChangeEvent, MouseEvent } from "react";

import { ResourceEdit } from "./ResourceEdit";
import ResourceRowRender from "./ResourceRowRender";
import { Link, Resource, ResourceKeys, Worksheet } from "./ResourceTypes";

interface ResourceRowProps {
  initialResource: Resource;
  onUpdateResource: (
    newResource: Resource,
    fileFormDataMap: Map<number, Worksheet>,
    linkMap: Map<number, Link>,
    newWorksheets: Array<Worksheet>,
    newLinks: Array<Link>
  ) => void;
  canEdit: boolean;
  onDeleteResource: (resourceId: number) => void;
  addingResource?: boolean;
  cancelOverride?: () => void;
}

/**
 * React component representing a row of the resource table.
 */
export const ResourceRow = ({
  initialResource,
  onUpdateResource,
  onDeleteResource,
  canEdit,
  addingResource = false,
  cancelOverride = undefined
}: ResourceRowProps): React.ReactElement => {
  const [edit, setEdit] = useState<boolean>(false);
  const [resource, setResource] = useState<Resource>({} as Resource);

  // update current resource if initialResource changes
  useEffect(() => {
    setResource(initialResource);
    setEdit(false);
  }, [initialResource]);

  useEffect(() => {
    setEdit(addingResource);
  }, [addingResource]);

  /**
   * Modifies a specified field of the current resource.
   *
   * @param e - onChange event
   * @param field - resource field to change
   */
  function handleChange(
    e: ChangeEvent<HTMLInputElement>,
    field: ResourceKeys.weekNum | ResourceKeys.date | ResourceKeys.topics
  ): void {
    const updatedResource: Resource = { ...resource };
    switch (field) {
      case ResourceKeys.weekNum: {
        updatedResource[field] = parseInt(e.target.value);
        break;
      }
      default: {
        updatedResource[field] = e.target.value;
        break;
      }
    }
    setResource(updatedResource);
  }

  /**
   * Bubbles change up to parent ResourceWrapper
   *
   * @param e - onSubmit event
   * @param fileFormDataMap - form data object containing file info
   * @param linkMap - form data object containing link info
   * @param newWorksheets - new worksheets
   */
  function handleSubmit(
    e: MouseEvent<HTMLButtonElement>,
    fileFormDataMap: Map<number, Worksheet>,
    linkMap: Map<number, Link>,
    newWorksheets: Array<Worksheet>,
    newLinks: Array<Link>
  ): void {
    e.preventDefault();
    onUpdateResource(resource, fileFormDataMap, linkMap, newWorksheets, newLinks);
    setEdit(false);
  }

  /**
   * Sets editing behavior depending on whether we can edit this resource/course
   */
  function handleSetEdit(): void {
    if (canEdit) {
      setEdit(true);
    }
  }

  /**
   * Sets edit state to false when user exits out of edit mode.
   */
  function handleCancel(): void {
    if (cancelOverride) {
      cancelOverride();
    } else {
      // reset resource to the original
      setResource(initialResource);
      setEdit(false);
    }
  }

  return (
    <div className="resource-row">
      {!addingResource && (
        <ResourceRowRender
          resource={resource}
          canEdit={canEdit}
          onSetEdit={handleSetEdit}
          onDelete={onDeleteResource}
        />
      )}
      {edit && (
        <ResourceEdit resource={resource} onChange={handleChange} onSubmit={handleSubmit} onCancel={handleCancel} />
      )}
    </div>
  );
};

export default ResourceRow;
