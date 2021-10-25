import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPencilAlt, faTrashAlt } from "@fortawesome/free-solid-svg-icons";
import Modal from "../Modal";
import { Resource } from "./ResourceTypes";

interface ResourceRowRenderProps {
  resource: Resource;
  canEdit: boolean;
  onSetEdit: () => void;
  onDelete: (resourceId: number) => void;
}

const ResourceTopics = ({ topics }: { topics: string }): React.ReactElement => {
  if (topics === undefined) return <div></div>;
  return (
    <React.Fragment>
      {topics.split(";").map((topic, index) => (
        <div className="topic" key={index}>
          {topic.trim()}
        </div>
      ))}
    </React.Fragment>
  );
};

const ResourceRowRender = ({ resource, canEdit, onSetEdit, onDelete }: ResourceRowRenderProps): React.ReactElement => {
  /**
   * Deletion stages:
   * 0: initial; did not click delete button
   * 1: confirmation; clicked delete button, asking for confirmation in modal
   */
  const [deletionStage, setDeletionStage] = useState<number>(0);

  /**
   * Handles actual deletion of resource; sets deletion stage to 0 to close modal.
   */
  function handleDelete() {
    onDelete(resource.id!);
    setDeletionStage(0);
  }

  return (
    <React.Fragment>
      {deletionStage === 1 && (
        <Modal className="resourceDeleteConfirmation" closeModal={() => setDeletionStage(0)}>
          <div className="resourceDeleteText">
            <h2>Are you sure you want to delete this resource?</h2>
            <p>This action is irreversible!</p>
            <button className="danger-btn" onClick={() => handleDelete()}>
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
                  <a href={worksheet.worksheetFile as string} target="_blank" rel="noreferrer">
                    {worksheet.name}
                  </a>
                </div>
                {worksheet.solutionFile && (
                  <div className="resourceSoln">
                    <a href={worksheet.solutionFile as string} target="_blank" rel="noreferrer">
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
    </React.Fragment>
  );
};

export default ResourceRowRender;
