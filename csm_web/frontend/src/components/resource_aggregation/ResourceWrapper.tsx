import React, { useState, useEffect } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { getRoles } from "../../utils/user.tsx";
import ResourceEdit from "./ResourceEdit.tsx";

const ResourceTopics = ({ topics }) => {
  if (topics === undefined) return <div></div>;
  return (
    topics.split('\x00').map((topic, index) =>
      <div className="topic" key={index}>{topic}</div>
    )
  )
}

const ResourceWrapper = ({ courseID }) => {

  const [resources, setResources] = useState([]);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchJSON(`/resources/${courseID}/resources`).then(data => {
      setResources(data);
      setCanEdit(getRoles()['COORDINATOR'].has(courseID));
    });
  }, [courseID]);

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
    for (let entry of resourceFormData.entries()) {
      console.log(entry)
    }
    fetchWithMethod(`resources/${courseID}/resources/`, HTTP_METHODS.PUT, resourceFormData, true).then(() => {
      fetchJSON(`/resources/${courseID}/resources`).then(data => {
        setResources(data);
      });
    });
  }

  return (
    <div className="resourceWrapperContainer">
      {
        resources.map((resource, index) =>
          <ResourceRow
            key={index}
            initialResource={resource}
            updateResource={handleUpdateResource}
            canEdit={canEdit}
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
  worksheetFile: string;
  solutionFile: string;
}

interface ResourceRow {
  initialResource: Resource;
  updateResource: Function;
  canEdit: boolean;
}

const ResourceRow = ({ initialResource, updateResource, canEdit }: ResourceRow) => {
  // call updateResource(resource) on change
  const [edit, setEdit] = useState(false);
  const [resource, setResource]: [Resource, Function] = useState({});
  const [fileFormData, setFileFormData] = useState(new FormData());

  // update current resource if initialResource changes
  useEffect(() => {
    setResource(initialResource);
    setEdit(false);
  }, [initialResource]);

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
    console.log('file changed ' + field)
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

  if (edit) {
    return <ResourceEdit resource={resource} handleChange={handleChange} handleFileChange ={handleFileChange} handleSubmit={handleSubmit} />
  }

  return (
    <div className="resourceContainer">
      <div className="resourceInfo">
        <div>Week {resource.weekNum}</div>
      </div>
      <div className="resourceInfo">
        <div>{resource.date}</div>
      </div>
      <div className="resourceInfo" id="resourceTopics">
        <div>Topics</div>
        <div><ResourceTopics topics={resource.topics} /></div>
      </div>
      <div className="resourceInfo" id="resourceWkstName">
        <div>{resource.worksheetName}</div>
      </div>
      <div className="resourceInfo">
        <div><a href={resource.worksheetFile}>Worksheet</a></div>
      </div>
      <div className="resourceInfo">
        <div><a href={resource.solutionFile}>Solutions</a></div>
      </div>
      {
        canEdit ? <button onClick={handleSetEdit} className="resourceButton"> EDIT </button> : <></>
      }
    </div>
  );
}

export default ResourceWrapper;
