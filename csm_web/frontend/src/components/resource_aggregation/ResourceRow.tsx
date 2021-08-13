import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPencilAlt, faTrashAlt } from '@fortawesome/free-solid-svg-icons'

const ResourceTopics = ({ topics }) => {
  if (topics === undefined) return <div></div>;
  // TODO: handle multiple topics with delimiters
  return topics.split("\x00").map((topic, index) => (
    <div className="topic" key={index}>
      {topic.trim()}
    </div>
  ));
};

const ResourceRowRender = ({ resource, canEdit, onSetEdit, onDelete }) => {
  console.log(resource);

  return (
    <div className="resourceContainer">
      <div className="resourceInfo weekNum">
        <div>Week {resource.weekNum}</div>
      </div>
      <div className="resourceInfo dateCell">
        <div>{resource.date}</div>
      </div>
      <div className="resourceInfo resourceTopics">
        <div>
          <ResourceTopics topics={resource.topics} />
        </div>
      </div>
      <div className="resourceWkstFilesContainer">
        {
          resource.worksheets &&
          resource.worksheets.map(worksheet => (
            <div key={worksheet.id} className="resourceWkst">
              <div className="resourceWkstFile">
                <a href={worksheet.worksheetFile} target="_blank">
                  {worksheet.name}
                </a>
              </div>
              <div className="resourceSoln">
                <a href={worksheet.solutionFile} target="_blank">
                  Solutions
                </a>
              </div>
            </div>
          ))
        }
      </div>
      {
        canEdit &&
        <div className="resourceButtonsContainer">
          <button onClick={onSetEdit} className="resourceButton">
            <FontAwesomeIcon icon={faPencilAlt} id="editIcon"/>
          </button>
          <button onClick={() => onDelete(resource.id)} className="resourceButton">
            <FontAwesomeIcon icon={faTrashAlt} id="deleteIcon"/>
          </button>
        </div>
      }
    </div>
  );
}

export default ResourceRowRender;