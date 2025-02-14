import { DateTime, Duration } from "luxon";
import React, { useEffect, useState } from "react";

import { DEFAULT_TIMEZONE } from "../../utils/datetime";
import {
  useCreateResourceMutation,
  useDeleteResourceMutation,
  useResources,
  useUpdateResourceMutation
} from "../../utils/queries/resources";
import { Role } from "../../utils/types";
import { Roles } from "../../utils/user";
import LoadingSpinner from "../LoadingSpinner";
import { ResourceRow } from "./ResourceRow";
import { emptyResource, Link, normalizeWorksheet, Resource, Worksheet } from "./ResourceTypes";

import PlusIcon from "../../../static/frontend/img/plus.svg";

import "../../css/resource_aggregation.scss";

interface ResourceTableProps {
  courseID: number;
  roles: Roles;
}

/**
 * React component representing the entire resource table, managing all resource rows.
 */
export const ResourceTable = ({ courseID, roles }: ResourceTableProps): React.ReactElement => {
  const { data: resources, isSuccess: resourcesLoaded } = useResources(courseID);
  const createResourceMutation = useCreateResourceMutation(courseID);
  const updateResourceMutation = useUpdateResourceMutation(courseID);
  const deleteResourceMutation = useDeleteResourceMutation(courseID);

  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [viewEdit, setViewEdit] = useState<boolean>(false);
  const [addingResource, setAddingResource] = useState<boolean>(false);

  /**
   * Gets resource data for a specific course when courseID changes
   */
  useEffect(() => {
    setCanEdit(roles[Role.COORDINATOR].has(courseID));
  }, [courseID, roles]);

  if (!resourcesLoaded) {
    return <LoadingSpinner className="spinner-centered" />;
  }

  /**
   * Merges fileFormData and newWorksheets with other resource attributes.
   *
   * All new worksheets have a null id, and existing worksheets use their id from the database.
   *
   * {
   *    [[resource fields]]
   *    "worksheets": [
   *        {id: ..., name: ..., worksheet_file: ..., solution_file: ...},
   *        ...
   *        {id: null, name: ..., worksheet_file: ..., solution_file: ...}
   *    ]
   * }
   *
   * @param newResource - the resource being edited
   * @param fileFormDataMap - form data object containing worksheet info
   * @param linkMap - form data object containing link info
   * @param newWorksheets - list of new worksheets to add
   * @param newLinks - list of new links to add
   * @returns
   */
  function getResourceFormData(
    newResource: Resource,
    fileFormDataMap: Map<number, Worksheet>,
    linkMap: Map<number, Link>,
    newWorksheets: Array<Worksheet>,
    newLinks: Array<Link>
  ) {
    const resourceFormData = new FormData();
    for (const [key, value] of Object.entries(newResource)) {
      if (key !== "worksheets" && key !== "links") {
        resourceFormData.set(key, value);
      }
    }
    let idx = 0; // cumulative index in worksheet array
    for (const unnormalizedWorksheet of fileFormDataMap.values()) {
      const worksheet = normalizeWorksheet(unnormalizedWorksheet);
      for (const [key, value] of Object.entries(worksheet)) {
        if (value instanceof Array) {
          // add each nested array item
          for (const [itemIdx, item] of value.entries()) {
            resourceFormData.append(`worksheets[${idx}][${key}][${itemIdx}]`, item);
          }
        } else {
          // add each nested FormData entry
          resourceFormData.append(`worksheets[${idx}][${key}]`, value);
        }
      }
      idx++;
    }
    for (const unnormalizedWorksheet of newWorksheets) {
      const worksheet = normalizeWorksheet(unnormalizedWorksheet);
      for (const [key, value] of Object.entries(worksheet)) {
        let updatedValue = value;

        // add each nested FormData entry
        if (value instanceof Array) {
          updatedValue = JSON.stringify(value);
        }
        resourceFormData.append(`worksheets[${idx}][${key}]`, updatedValue);
      }
      idx++;
    }
    idx = 0;
    for (const link of linkMap.values()) {
      for (const [key, value] of Object.entries(link)) {
        if (value instanceof Array) {
          // add each nested array item
          for (const [itemIdx, item] of value.entries()) {
            resourceFormData.append(`links[${idx}][${key}][${itemIdx}]`, item);
          }
        } else {
          let updatedValue = value;
          // Handle urls
          if (key === "url") {
            if (!value.startsWith("http")) {
              updatedValue = "https://" + value;
            }
          }

          // add each nested FormData entry
          resourceFormData.append(`links[${idx}][${key}]`, updatedValue);
        }
      }
      idx++;
    }
    for (const link of newLinks) {
      for (const [key, value] of Object.entries(link)) {
        let updatedValue = value;
        // add each nested FormData entry
        if (value instanceof Array) {
          updatedValue = JSON.stringify(value);
        }

        // Handle urls
        if (key === "url") {
          if (!value.startsWith("http")) {
            updatedValue = "https://" + value;
          }
        }

        resourceFormData.append(`links[${idx}][${key}]`, updatedValue);
      }
      idx++;
    }
    return resourceFormData;
  }

  /**
   * Toggle whether or not the user is currently adding a new resoruce.
   *
   * This needs to be a separate state because we reuse the same ResourceEdit component,
   * but we do not want to render the new resource just yet.
   */
  function handleSetAddingResource() {
    setAddingResource(true);
  }

  /**
   * Save and POST request the newly added resource
   *
   * @param newResource new resource to add
   * @param fileFormDataMap FormData object for any files to add
   * @param linkMap form data object containing link info
   * @param newWorksheets list of worksheets to add to resource
   * @param newLinks list of links to add to resource
   */
  function handleAddResource(
    newResource: Resource,
    fileFormDataMap: Map<number, Worksheet>,
    linkMap: Map<number, Link>,
    newWorksheets: Array<Worksheet>,
    newLinks: Array<Link>
  ) {
    const resourceFormData = getResourceFormData(newResource, fileFormDataMap, linkMap, newWorksheets, newLinks);
    createResourceMutation.mutate(resourceFormData);
    setAddingResource(false);
  }

  function handleCancelAddResource() {
    setAddingResource(false);
  }

  /**
   * Save and PUT request the updated resource
   * @param newResource new resource to add
   * @param fileFormDataMap FormData object for any files to add
   * @param linkMap form data object containing link info
   * @param newWorksheets list of worksheets to add to resource
   */
  function handleUpdateResource(
    newResource: Resource,
    fileFormDataMap: Map<number, Worksheet>,
    linkMap: Map<number, Link>,
    newWorksheets: Array<Worksheet>,
    newLinks: Array<Link>
  ) {
    const resourceFormData = getResourceFormData(newResource, fileFormDataMap, linkMap, newWorksheets, newLinks);
    updateResourceMutation.mutate(resourceFormData);
  }

  /**
   * Deletes a specified resource from the database
   * @param resourceId - numerical id of resource
   */
  function handleDeleteResource(resourceId: number) {
    deleteResourceMutation.mutate({ id: resourceId });
  }

  /**
   * Creates a new resource, populating the week number with the next week number,
   * and populating the date with the date a week after the previous resource.
   */
  function getNextResource() {
    const newResource = emptyResource();

    if (!resourcesLoaded) {
      return newResource;
    }
    // return empty resource if first resource to be added
    if (resources.length == 0) {
      return newResource;
    }
    const lastResource = resources[resources.length - 1]; // get last resource
    newResource.weekNum = lastResource.weekNum + 1;

    // parse date from the resource, and add a week
    const date = DateTime.fromISO(lastResource.date, { zone: DEFAULT_TIMEZONE }).plus(Duration.fromObject({ week: 1 }));

    // format the new date
    newResource.date = date.toISODate()!;
    return newResource;
  }

  /**
   * Toggles whether the user wants to view the editing buttons.
   *
   * @param e checkbox toggle event
   */
  function handleToggleViewEdit(e: React.ChangeEvent<HTMLInputElement>) {
    setViewEdit(e.target.checked);
  }

  return (
    <div className="resource-wrapper-container">
      {canEdit && (
        <div className="resource-table-options">
          <button onClick={handleSetAddingResource} className="primary-outline-btn" id="add-resource-button">
            <PlusIcon className="icon" />
            <div>Add Resource</div>
          </button>
          <div className="toggle-view-edit-container">
            <label htmlFor="toggle-view-edit-input" className="primary-outline-btn">
              <input type="checkbox" checked={viewEdit} id="toggle-view-edit-input" onChange={handleToggleViewEdit} />
              Toggle Edit
            </label>
          </div>
        </div>
      )}
      <div className="resource-table-container">
        <div className="resource-table">
          <div className="resource-wrapper-header">
            <div className="week-num">Week</div>
            <div className="date-cell">Date</div>
            <div className="resource-topics">Topics</div>
            <div className="resource-worksheet">Worksheets</div>
            <div className="resource-links">Links</div>
          </div>
          {addingResource && (
            <ResourceRow
              initialResource={getNextResource()}
              onUpdateResource={handleAddResource}
              onDeleteResource={handleDeleteResource}
              canEdit={canEdit && viewEdit}
              addingResource={addingResource}
              cancelOverride={handleCancelAddResource}
            />
          )}
          {resources.map((resource, index) => (
            <ResourceRow
              key={index}
              initialResource={resource}
              onUpdateResource={handleUpdateResource}
              onDeleteResource={handleDeleteResource}
              canEdit={canEdit && viewEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResourceTable;
