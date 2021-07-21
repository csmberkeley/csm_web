import React, { useState, useEffect } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";

const ResourceWrapper = ({ course_id }) => {

  const [resources, setResources] = useState([]);

  useEffect(() => {
    fetchJSON(`/resources/${course_id}/resources`).then(data => {
      setResources(data);
    });
  }, [course_id]);

  /**
   * Save and PUT request the updated resource
   */
  function handleUpdateResource(newResource) {
    fetchWithMethod(`resources/${course_id}/resources/`, HTTP_METHODS.PUT, { "resource": newResource });
  }

  return (
    <div className="resource-wrapper">
      {
        resources.map((resource, index) =>
          <ResourceRow
            key={index}
            initialResource={resource}
            updateResource={handleUpdateResource}
          />
        )
      }
    </div>
  )
};

interface Resource {
  weekNum: number;
  date: string;
  topics: string;
  worksheetName: string;
  worksheetFile: string;  // TODO: finalize file handling
  solutionFile: string;
}

const ResourceRow = ({ initialResource, updateResource }) => {
  // call updateResource(resource) on change
  const [edit, setEdit] = useState(false);
  const [resource, setResource] = useState(initialResource)

  /**
   * Modifies a specified field of the current resource.
   *
   * @param e - onChange event
   * @param field - resource field to change
   */
  function handleChange(e, field) {
    resource[field] = e.target.value;
    setResource(resource)
  }

  /**
   * Bubbles change up to parent ResourceWrapper
   *
   * @param e - onSubmit event
   */
  function handleSubmit(e) {
    e.preventDefault()
    updateResource(resource)
  }

  return (
    <div>
      {
        edit ?
          <button onClick={handleSubmit}> SUBMIT </button>
          :
          <button onClick={() => setEdit(true)}> EDIT </button>
      }
      <div>
        <div>Week Number</div>
        {
          edit ?
            <input type="text" defaultValue={resource.weekNum}
              onChange={e => handleChange(e, 'week_num')} />
            :
            <div>{resource.weekNum}</div>
        }
      </div>
      <div>
        <div>Date</div>
        {
          edit ?
            <input type="date" defaultValue={resource.date} onChange={e => handleChange(e, 'date')} />
            :
            <div>{resource.date}</div>
        }
      </div>
      <div>
        <div>Topics</div>
        {
          edit ?
            <input type="text" defaultValue={resource.topics} onChange={e => handleChange(e, 'topics')} />
            :
            <div>{resource.topics}</div>
        }
      </div>
      <div>
        <div>Worksheet Name</div>
        {
          edit ?
            <input type="text" defaultValue={resource.worksheetName} onChange={e => handleChange(e, 'worksheet_name')} />
            :
            <div>{resource.worksheetName}</div>
        }
      </div>
      <div> {/* TODO: change into file uploads */}
        <div>Worksheet File</div>
        <div>{resource.worksheetFile}</div>
      </div>
      <div>
        <div>Solution File</div>
        <div>{resource.solutionFile}</div>
      </div>
    </div>
  );
}

export default ResourceWrapper;
