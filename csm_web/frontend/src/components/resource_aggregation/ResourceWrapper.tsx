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
  function handleUpdateResource(newResource, fileFormData) {
    let resourceFormData = new FormData();
    for (let key of Object.keys(newResource)) {
      resourceFormData.set(key, newResource[key]);
    }
    for (let entry of fileFormData.entries()) {
      resourceFormData.set(entry[0], entry[1])
    }
    fetchWithMethod(`resources/${course_id}/resources/`, HTTP_METHODS.PUT, resourceFormData, true);
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
  const [resource, setResource] = useState(initialResource);
  const [fileFormData, setFileFormData] = useState(new FormData());

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

  function handleFileChange(e, field) {
    fileFormData.set(field, e.target.files[0]);
    setFileFormData(fileFormData);
  }

  /**
   * Bubbles change up to parent ResourceWrapper
   *
   * @param e - onSubmit event
   */
  function handleSubmit(e) {
    e.preventDefault()
    updateResource(resource, fileFormData)
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
              onChange={e => handleChange(e, 'weekNum')} />
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
            <input type="text" defaultValue={resource.worksheetName} onChange={e => handleChange(e, 'worksheetName')} />
            :
            <div>{resource.worksheetName}</div>
        }
      </div>
      <div>
        <div>Worksheet File</div>
        {
          edit ?
            <input type="file" onChange={e => handleFileChange(e, 'worksheetFile')} />
            :
            <div>{resource.worksheetFile}</div>
        }
      </div>
      <div>
        <div>Solution File</div>
        {
          edit ?
            <input type="file" onChange={e => handleFileChange(e, 'solutionFile')} />
            :
            <div>{resource.solutionFile}</div>
        }
      </div>
    </div>
  );
}

export default ResourceWrapper;
