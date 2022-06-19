import React, { useState, useEffect } from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import ResourceRow from "./ResourceRow";
import { emptyResource, Link, Resource, Worksheet } from "./ResourceTypes";
import { Roles } from "../../utils/user";

import PlusCircle from "../../../static/frontend/img/plus-circle.svg";

interface ResourceTableProps {
  courseID: number;
  roles: Roles;
  getResources: () => Promise<Array<Resource>>;
  updateResources: () => Promise<Array<Resource>>;
}

/**
 * React component representing the entire resource table, managing all resource rows.
 */
export const ResourceTable = ({
  courseID,
  roles,
  getResources,
  updateResources
}: ResourceTableProps): React.ReactElement => {
  const [resources, setResources] = useState<Array<Resource>>([]);
  const [canEdit, setCanEdit] = useState<boolean>(false);
  const [viewEdit, setViewEdit] = useState<boolean>(false);
  const [addingResource, setAddingResource] = useState<boolean>(false);

  /**
   * Gets resource data for a specific course when courseID changes
   */
  useEffect(() => {
    setCanEdit(roles["COORDINATOR"].has(courseID));
    getResources().then(data => {
      setResources(data);
    });
  }, [courseID, roles]);

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
    for (const worksheet of fileFormDataMap.values()) {
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
    for (const worksheet of newWorksheets) {
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
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.POST, resourceFormData, true).then(response => {
      if (response.status === 400) {
        // Bad request; input invalid
        response.json().then(data => {
          console.error(data);
        });
      }
      updateResources().then(data => {
        setResources(data);
      });
    });
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
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.PUT, resourceFormData, true).then(response => {
      if (response.status === 400) {
        // Bad request; input invalid
        response.json().then(data => {
          console.error(data);
        });
      }
      updateResources().then(data => {
        setResources(data);
      });
    });
  }

  /**
   * Deletes a specified resource from the database
   * @param resourceId - numerical id of resource
   */
  function handleDeleteResource(resourceId: number) {
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.DELETE, { id: resourceId }, false).then(
      response => {
        if (response.status === 400) {
          // Bad request; input invalid
          response.json().then(data => {
            console.error(data);
          });
        }
        updateResources().then(data => {
          setResources(data);
        });
      }
    );
  }

  /**
   * Creates a new resource, populating the week number with the next week number,
   * and populating the date with the date a week after the previous resource.
   */
  function getNextResource() {
    const newResource = emptyResource();
    // return empty resource if first resource to be added
    if (resources.length == 0) {
      return newResource;
    }
    const lastResource = resources[resources.length - 1]; // get last resource
    newResource.weekNum = lastResource.weekNum + 1;

    // add a week
    const date = new Date(Date.parse(lastResource.date));
    date.setUTCDate(date.getUTCDate() + 7);

    // pad month and day
    const newMonth = `${date.getUTCMonth() + 1}`.padStart(2, "0");
    const newDay = `${date.getUTCDate()}`.padStart(2, "0");
    newResource.date = `${date.getUTCFullYear()}-${newMonth}-${newDay}`;
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
    <div className="resourceWrapperContainer">
      {canEdit && (
        <div className="resourceTableOptions">
          <button onClick={handleSetAddingResource} className="addResourceButton" id="addResourceButton">
            <PlusCircle className="icon" id="plusIcon" />
            <div>Add Resource</div>
          </button>
          <div className="toggleViewEditContainer">
            <label htmlFor="toggleViewEditInput" id="toggleViewEditLabel">
              <input type="checkbox" checked={viewEdit} id="toggleViewEditInput" onChange={handleToggleViewEdit} />
              Toggle Edit
            </label>
          </div>
        </div>
      )}
      <div className="resourceTableContainer">
        <div className="resourceTable">
          <div className="resourceWrapperHeader">
            <div className="weekNum">Week</div>
            <div className="dateCell">Date</div>
            <div className="resourceTopics">Topics</div>
            <div className="resourceWkst">Worksheets</div>
            <div className="resourceLinks">Links</div>
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
