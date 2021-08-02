import React, { useState, useEffect } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { getRoles } from "../../utils/user";
import ResourceRow from "./ResourceRow";

export const ResourceWrapper = ({ courseID }) => {
  const [resources, setResources] = useState([]);
  const [canEdit, setCanEdit] = useState(false);

  /**
   * Gets resource data for a specific course when courseID changes
   */
  useEffect(() => {
    fetchJSON(`/resources/${courseID}/resources`).then(data => {
      setResources(data);
      getRoles().then( (roles) =>
        setCanEdit(roles["COORDINATOR"].has(courseID))
      );
      //setCanEdit(getRoles()["COORDINATOR"].has(courseID));
    });
  }, [courseID]);

  /**
   * Save and PUT request the updated resource
   */
  function handleUpdateResource(newResource, fileFormData) {
    let resourceFormData = new FormData();
    for (const [key, value] of Object.entries(newResource)) {
      resourceFormData.set(key, value as any);
    }
    for (let entry of fileFormData.entries()) {
      resourceFormData.set(entry[0], entry[1]);
    }
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.PUT, resourceFormData, true).then(() => {
      fetchJSON(`/resources/${courseID}/resources`).then(data => {
        setResources(data);
      });
    });
  }

  return (
    <div className="resourceWrapperContainer">
      <div className="resourceWrapperHeader">
        <div className="weekNum">Week</div>
        <div className="dateCell">Date</div>
        <div className="resourceTopics">Topics</div>
        <div className="resourceWkst">Worksheet and Solutions</div>
      </div>
      {resources.map((resource, index) => (
        <ResourceRow key={index} initialResource={resource} updateResource={handleUpdateResource} canEdit={canEdit} />
      ))}
    </div>
  );
};

export default ResourceWrapper;
