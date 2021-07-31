import React, { useState, useEffect } from "react";
import ResourceEdit from "./ResourceEdit.tsx";
import { Resource, ResourceRowProps } from "./ResourceTypes";

const ResourceTopics = ({ topics }) => {
  if (topics === undefined) return <div></div>;
  // TODO: handle multiple topics with delimiters
  return topics.split("\x00").map((topic, index) => (
    <div className="topic" key={index}>
      {topic.trim()}
    </div>
  ));
};

const ResourceRow = ({ initialResource, updateResource, canEdit }: ResourceRowProps) => {
  // call updateResource(resource) on change
  const [edit, setEdit] = useState(false);
  const [resource, setResource]: [Resource, Function] = useState({} as Resource);
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
    setResource(resource);
  }

  /**
   * Modifies a specified file field of the current resource.
   *
   * @param e - onChange event
   * @param field - resource field to change
   */
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
    e.preventDefault();
    updateResource(resource, fileFormData);
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
    return (
      <ResourceEdit
        resource={resource}
        handleChange={handleChange}
        handleFileChange={handleFileChange}
        handleSubmit={handleSubmit}
      />
    );
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
        <div>
          <ResourceTopics topics={resource.topics} />
        </div>
      </div>
      <div className="resourceInfo" id="resourceWkstName">
        <div>{resource.worksheetName}</div>
      </div>
      <div className="resourceInfo">
        <div>
          <a href={resource.worksheetFile} target="_blank">
            Worksheet
          </a>
        </div>
      </div>
      <div className="resourceInfo">
        <div>
          <a href={resource.solutionFile} target="_blank">
            Solutions
          </a>
        </div>
      </div>
      {canEdit ? (
        <button onClick={handleSetEdit} className="resourceButton">
          EDIT
        </button>
      ) : (
        <></>
      )}
    </div>
  );
};

export default ResourceRow;
