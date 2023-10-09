import { DateTime } from "luxon";
import React, { useState } from "react";

import { DEFAULT_TIMEZONE, formatDate } from "../../utils/datetime";
import Modal from "../Modal";
import { Resource } from "./ResourceTypes";

import Pencil from "../../../static/frontend/img/pencil.svg";
import Trash from "../../../static/frontend/img/trash-alt.svg";

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
        <Modal className="resource-delete-confirmation" closeModal={() => setDeletionStage(0)}>
          <div className="resource-delete-text">
            <h2>Are you sure you want to delete this resource?</h2>
            <p>This action is irreversible!</p>
            <button className="danger-btn" onClick={() => handleDelete()}>
              Confirm
            </button>
          </div>
        </Modal>
      )}
      <div className="resource-container">
        <div className="resource-info week-num">
          <div>Week {resource.weekNum}</div>
        </div>
        <div className="resource-info date-cell">
          <div>{formatDate(DateTime.fromISO(resource.date, { zone: DEFAULT_TIMEZONE }))}</div>
        </div>
        <div className="resource-info resource-topics">
          <ResourceTopics topics={resource.topics} />
        </div>
        <div className="resource-worksheet-files-container">
          {resource.worksheets &&
            resource.worksheets.map(worksheet => (
              <div key={worksheet.id} className="resource-worksheet">
                <div className="resource-worksheet-file">
                  <a href={worksheet.worksheetFile as string} target="_blank" rel="noreferrer">
                    {worksheet.name}
                  </a>
                </div>
                {worksheet.solutionFile && (
                  <div className="resource-solution">
                    <a href={worksheet.solutionFile as string} target="_blank" rel="noreferrer">
                      Solutions
                    </a>
                  </div>
                )}
              </div>
            ))}
        </div>
        <div className="resource-links-container">
          {resource.links &&
            resource.links.map(link => (
              <div key={link.id} className="resource-link">
                <div className="resource-link">
                  <a href={link.url} target="_blank" rel="noreferrer">
                    {link.name}
                  </a>
                </div>
              </div>
            ))}
        </div>
        {canEdit && (
          <div className="resource-buttons-container">
            <button onClick={onSetEdit} className="resource-button">
              <Pencil className="icon" id="edit-icon" />
            </button>
            <button onClick={() => setDeletionStage(1)} className="resource-button">
              <Trash className="icon" id="delete-icon" />
            </button>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export default ResourceRowRender;
