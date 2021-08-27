import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import Modal from "../Modal";

const ResourceTopics = ({ topics }) => {
  if (topics === undefined) return <div></div>;
  return topics.split(";").map((topic, index) => (
    <div className="topic" key={index}>
      {topic.trim()}
    </div>
  ));
};

const ResourceRowRender = ({ resource, canEdit, onSetEdit, onDelete }) => {
  /**
   * Deletion stages:
   * 0: initial; did not click delete button
   * 1: confirmation; clicked delete button, asking for confirmation in modal
   */
  const [deletionStage, setDeletionStage] = useState(0);
  return (
    <>
      {deletionStage === 1 && (
        <Modal className="resourceDeleteConfirmation" closeModal={() => setDeletionStage(0)}>
          <div className="resourceDeleteText">
          <h2>Are you sure you want to delete this resource?</h2>
          <p>This action is irreversible!</p>
          <button className="danger-btn" onClick={() => onDelete(resource.id)}>
            Confirm
          </button>
          </div>
        </Modal>
      )}
      <div className="resourceContainer">
        <div className="resourceInfo weekNum">
          <div>Week {resource.weekNum}</div>
        </div>
        <div className="resourceInfo dateCell">
          <div>{resource.date}</div>
        </div>
        <div className="resourceInfo resourceTopics">
          <ResourceTopics topics={resource.topics} />
        </div>
        <div className="resourceWkstFilesContainer">
          {resource.worksheets &&
            resource.worksheets.map(worksheet => (
              <div key={worksheet.id} className="resourceWkst">
                <div className="resourceWkstFile">
                  <a href={worksheet.worksheetFile} target="_blank">
                    {worksheet.name}
                  </a>
                </div>
                {worksheet.solutionFile && (
                  <div className="resourceSoln">
                    <a href={worksheet.solutionFile} target="_blank">
                      Solutions
                    </a>
                  </div>
                )}
              </div>
            ))}
        </div>
        {canEdit && (
          <div className="resourceButtonsContainer">
            <button onClick={onSetEdit} className="resourceButton">
              <FontAwesomeIcon icon={faPencilAlt} id="editIcon" />
            </button>
            <button onClick={() => setDeletionStage(1)} className="resourceButton">
              <FontAwesomeIcon icon={faTrashAlt} id="deleteIcon" />
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ResourceRowRender;
