import React, { useState, useEffect } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { getRoles } from "../../utils/user";
import ResourceRow from "./ResourceRow";
import { emptyResource } from "./ResourceTypes";

export const ResourceWrapper = ({ courseID }) => {
  const [resources, setResources] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [addingResource, setAddingResource] = useState(false);

  /**
   * Gets resource data for a specific course when courseID changes
   */
  useEffect(() => {
    fetchJSON(`/resources/${courseID}/resources`).then(data => {
      setResources(data);
      getRoles().then((roles) =>
        setCanEdit(roles["COORDINATOR"].has(courseID))
      );
      //setCanEdit(getRoles()["COORDINATOR"].has(courseID));
    });
  }, [courseID]);


  function getResourceFormData(newResource, fileFormData) {
    let resourceFormData = new FormData();
    for (const [key, value] of Object.entries(newResource)) {
      resourceFormData.set(key, value as any);
    }
    for (let entry of fileFormData.entries()) {
      resourceFormData.set(entry[0], entry[1]);
    }
    return resourceFormData;
  }

  function handleAddResource(newResource, fileFormData) {
    console.log('Submitted resource');
    const resourceFormData = getResourceFormData(newResource, fileFormData);
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.POST, resourceFormData, true).then(() => {
      fetchJSON(`/resources/${courseID}/resources`).then(data => {
        setResources(data);
      });
    })
    setAddingResource(false);
  }

  function handleCancelAddResource() {
    console.log('canceled add resource');
    setAddingResource(false);
  }

  /**
   * Save and PUT request the updated resource
   */
  function handleUpdateResource(newResource, fileFormData) {
    const resourceFormData = getResourceFormData(newResource, fileFormData);
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
      {
        canEdit &&
        <button onClick={setAddingResource}>Add Resource</button>
      }
      <div className="resourceWrapperHeader">
        <div className="weekNum">Week</div>
        <div className="dateCell">Date</div>
        <div className="resourceTopics">Topics</div>
        <div className="resourceWkst">Worksheet and Solutions</div>
      </div>
      {
        addingResource &&
        <ResourceRow
          initialResource={emptyResource()}
          updateResource={handleAddResource}
          deleteResource={handleDeleteResource}
          canEdit={canEdit}
          addingResource={addingResource}
          cancelOverride={handleCancelAddResource}
        />
      }
      {
        resources.map((resource, index) => (
          <ResourceRow key={index} initialResource={resource} updateResource={handleUpdateResource} deleteResource={handleDeleteResource} canEdit={canEdit} />
        ))
      }
    </div>
  );
};

export default ResourceWrapper;
