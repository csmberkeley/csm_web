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
            <div className="resourceWkst">
                <div className="resourceWkstFile">
                    <a href={resource.worksheetFile} target="_blank">
                        {/*resource.worksheetName*/}Worksheet Name
                </a>
                </div>
                <div className="resourceSoln">
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