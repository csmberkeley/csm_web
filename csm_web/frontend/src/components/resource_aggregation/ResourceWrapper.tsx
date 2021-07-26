import { resourceUsage } from "process";
import React, { useState, useEffect } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { getRoles } from "../../utils/user.tsx";

const ResourceWrapper = ({ courseID }) => {

  const [resources, setResources] = useState([]);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    fetchJSON(`/resources/${courseID}/resources`).then(data => {
      setResources(data);
      console.log(data);
      setCanEdit(getRoles()['COORDINATOR'].has(courseID));
    });
  }, [courseID]);

  const mockResources = [
    {
      weekNum: 1,
      date: "8/31/21",
      topics: ["scheme", "trees"],
      worksheetNAme: "intro to 61a",
      worksheetFile: "",
      worksheetSolutions: ""
    },
    {
      weekNum: 2,
      date: "10/31/21",
      topics: ["pandas", "threading"],
      worksheetNAme: "not an intro to 61a",
      worksheetFile: "",
      worksheetSolutions: ""
    }
  ]

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
    <div className={styles.resourceWrapperContainer}>
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
  worksheetFile: string;  // TODO: finalize file handling
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

  return (
    <div>
      {
        edit ?
          <button onClick={handleSubmit}> SUBMIT </button>
          :
          canEdit ? <button onClick={handleSetEdit}> EDIT </button> : <></>
      }
      <div>
        <div>Week Number</div>
        {
          edit ?
            <input type="number" defaultValue={resource.weekNum}
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
        {
          edit ?
            (<div>
              <label>Worksheet Name</label><input type="text" defaultValue={resource.worksheetName} onChange={e => handleChange(e, 'worksheetName')} /><br/>
              <label>Worksheet File</label><input type="file" onChange={e => handleFileChange(e, 'worksheetFile')} /><br/>
              <label>Solution File</label><input type="file" onChange={e => handleFileChange(e, 'solutionFile')} />
            </div>)
            :
            (<div>
              <a href={resource.worksheetFile}>{resource.worksheetName}</a>
              (<a href={resource.solutionFile}>solutions</a>)
            </div>)
        }
      </div>
    </div>
  );
}

export default ResourceWrapper;
