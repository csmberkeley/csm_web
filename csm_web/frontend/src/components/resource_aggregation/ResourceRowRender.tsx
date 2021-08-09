import React from "react";

const ResourceTopics = ({ topics }) => {
    if (topics === undefined) return <div></div>;
    // TODO: handle multiple topics with delimiters
    return topics.split("\x00").map((topic, index) => (
        <div className="topic" key={index}>
            {topic.trim()}
        </div>
    ));
};

const ResourceRowRender = ({ resource, canEdit, handleSetEdit, handleDelete }) => {

    return (
        <div className="resourceContainer">
            <div className="resourceInfo">
                <div>Week {resource.weekNum}</div>
            </div>
            <div className="resourceInfo">
                <div className="dateCell">{resource.date}</div>
            </div>
            <div className="resourceInfo" id="resourceTopics">
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
            {
                canEdit &&
                <div>
                    <button onClick={handleSetEdit} className="resourceButton">
                        EDIT
                    </button>
                    <button onClick={() => handleDelete(resource.id)} className="resourceButton">
                        DELETE
                    </button>
                </div>
            }
        </div>
    );
}

export default ResourceRowRender;