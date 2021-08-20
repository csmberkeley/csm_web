import React, { useState, useEffect, ChangeEvent } from "react";
import ResourceEdit from "./ResourceEdit";
import { Resource, ResourceRowProps, Worksheet } from "./ResourceTypes";
import ResourceRowRender from "./ResourceRowRender";

/**
 * React component representing a row of the resource table.
 */
export const ResourceRow = ({
  initialResource,
  onUpdateResource,
  onDeleteResource,
  canEdit,
  addingResource,
  cancelOverride
}: ResourceRowProps) => {
  const [edit, setEdit] = useState(false);
  const [resource, setResource]: [Resource, Function] = useState({} as Resource);

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
  function handleChange(e: ChangeEvent<HTMLInputElement>, field: string): void {
    resource[field] = e.target.value;
    setResource(resource);
  }

  /**
   * Bubbles change up to parent ResourceWrapper
   *
   * @param e - onSubmit event
   */
  function handleSubmit(
    e: ChangeEvent<HTMLInputElement>,
    fileFormDataMap: Map<number, Worksheet>,
    newWorksheets: Array<Worksheet>
  ): void {
    e.preventDefault();
    onUpdateResource(resource, fileFormDataMap, newWorksheets);
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
      setEdit(false);
    }
  }

  return (
    <div>
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

ResourceRow.defaultProps = {
  addingResource: false,
  cancelOverride: null
};

export default ResourceRow;
