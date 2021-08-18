import React, { useState, useEffect } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { getRoles } from "../../utils/user";
import ResourceRow from "./ResourceWrapper";
import { emptyResource, Resource, Worksheet } from "./ResourceTypes";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlusCircle } from "@fortawesome/free-solid-svg-icons";

export const ResourceTable = ({ courseID }) => {
  const [resources, setResources] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [addingResource, setAddingResource] = useState(false);

  /**
   * Gets resource data for a specific course when courseID changes
   */
  useEffect(() => {
    fetchJSON(`/resources/${courseID}/resources`).then(data => {
      setResources(data);
      getRoles().then(roles => setCanEdit(roles["COORDINATOR"].has(courseID)));
      //setCanEdit(getRoles()["COORDINATOR"].has(courseID));
    });
  }, [courseID]);

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
   * @param newResource
   * @param fileFormDataMap
   * @param newWorksheets
   * @returns
   */
  function getResourceFormData(
    newResource: Resource,
    fileFormDataMap: Map<number, Worksheet>,
    newWorksheets: Array<Worksheet>
  ) {
    let resourceFormData = new FormData();
    for (const [key, value] of Object.entries(newResource)) {
      if (key !== "worksheets") {
        resourceFormData.set(key, value as any);
      }
    }
    let idx = 0; // cumulative ndex in worksheet array
    for (let worksheet of fileFormDataMap.values()) {
      for (let [key, value] of Object.entries(worksheet)) {
        if (value instanceof Array) {
          // add each nested array item
          for (let [itemIdx, item] of value.entries()) {
            resourceFormData.append(`worksheets[${idx}][${key}][${itemIdx}]`, item)
          }
        } else {
          // add each nested FormData entry
          resourceFormData.append(`worksheets[${idx}][${key}]`, value);
        }
      }
      idx++;
    }
    for (let worksheet of newWorksheets) {
      for (let [key, value] of Object.entries(worksheet)) {
        // add each nested FormData entry
        if (value instanceof Array) {
          value = JSON.stringify(value);
        }
        resourceFormData.append(`worksheets[${idx}][${key}]`, value);
      }
      idx++;
    }
    return resourceFormData;
  }

  function handleSetAddingResource() {
    setAddingResource(true);
  }

  function handleAddResource(
    newResource: Resource,
    fileFormDataMap: Map<number, Worksheet>,
    newWorksheets: Array<Worksheet>
  ) {
    const resourceFormData = getResourceFormData(newResource, fileFormDataMap, newWorksheets);
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.POST, resourceFormData, true).then(() => {
      fetchJSON(`/resources/${courseID}/resources`).then(data => {
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
   */
  function handleUpdateResource(newResource, fileFormDataMap, newWorksheets) {
    const resourceFormData = getResourceFormData(newResource, fileFormDataMap, newWorksheets);
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.PUT, resourceFormData, true).then(() => {
      fetchJSON(`/resources/${courseID}/resources`).then(data => {
        setResources(data);
      });
    });
  }

  /**
   * Deletes a specified resource from the database
   */
  function handleDeleteResource(resourceId) {
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.DELETE, { id: resourceId }, false).then(() => {
      fetchJSON(`/resources/${courseID}/resources`).then(data => {
        setResources(data);
      });
    });
  }

  return (
    <div className="resourceWrapperContainer">
      {canEdit && (
        <button onClick={handleSetAddingResource} id="addResourceButton">
          <FontAwesomeIcon icon={faPlusCircle} id="plusIcon" />
          <div>Add Resource</div>
        </button>
      )}
      <div className="resourceWrapperHeader">
        <div className="weekNum">Week</div>
        <div className="dateCell">Date</div>
        <div className="resourceTopics">Topics</div>
        <div className="resourceWkst">Worksheet and Solutions</div>
      </div>
      {addingResource && (
        <ResourceRow
          initialResource={emptyResource()}
          onUpdateResource={handleAddResource}
          onDeleteResource={handleDeleteResource}
          canEdit={canEdit}
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
          canEdit={canEdit}
        />
      ))}
    </div>
  );
};

export default ResourceTable;
