import React, { useState, useEffect } from "react";
import ResourceEdit from "./ResourceEdit";
import { Resource, ResourceRowProps } from "./ResourceTypes";
import ResourceRowRender from "./ResourceRow";

export const ResourceRow = ({ initialResource, onUpdateResource, onDeleteResource, canEdit, addingResource, cancelOverride }: ResourceRowProps) => {
  // call updateResource(resource) on change
  const [edit, setEdit] = useState(false);
  const [resource, setResource]: [Resource, Function] = useState({} as Resource);
  const [fileFormData, setFileFormData] = useState(new FormData());

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
  function handleChange(e, field) {
    resource[field] = e.target.value;
    setResource(resource);
  }

  /**
   * Modifies a specified file field of the current resource.
   * TODO: modify to handle multiple resources
   * - mapping from worksheet id to modifications?
   *
   * @param e - onChange event
   * @param field - resource field to change
   */
  function handleFileChange(e, worksheet_id, field) {
    fileFormData.set(field, e.target.files[0]);
    setFileFormData(fileFormData);
  }

  /**
   * Bubbles change up to parent ResourceWrapper
   *
   * @param e - onSubmit event
   */
  function handleSubmit(e) {
    e.preventDefault();
    onUpdateResource(resource, fileFormData);
    setEdit(false);
  }

  /**
   * Sets editing behavior depending on whether we can edit this resource/course
   */
  function handleSetEdit() {
    if (canEdit) {
      setEdit(true);
    }
  }

  /**
   * Sets edit state to false when user exits out of edit mode.
   */
  function handleCancel() {
    if (cancelOverride) {
      cancelOverride();
    } else {
      setEdit(false);
    }
  }

  return (
    <div>
      {
        !addingResource &&
        <ResourceRowRender resource={resource} canEdit={canEdit} onSetEdit={handleSetEdit} onDelete={onDeleteResource} />
      }
      {
        edit &&
        <ResourceEdit
          resource={resource}
          onChange={handleChange}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      }
    </div>
  )
};

ResourceRow.defaultProps = {
  addingResource: false,
  cancelOverride: null
}

export default ResourceRow;
