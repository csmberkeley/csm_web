import React, { useState, useEffect } from "react";
import { fetchJSON } from "../../utils/api";
import ResourceTable from "./ResourceTable";

export const Resources = () => {
  const [selectedCourseID, setSelectedCourseID] = useState(1);
  const [courses, setCourses] = useState([]);
  // TODO: have mapping of course id to resource list to store previous gets

  useEffect(() => {
    fetchJSON("courses").then(data => {
      setCourses(data);
    });
  }, []);

  function handleTabClick(courseID) {
    setSelectedCourseID(courseID);
  }

  return (
    <div className="outer">
      <div className="tabs">
        <div className="tab-list">
          {courses.map(course => (
            <button
              onClick={() => handleTabClick(course.id)}
              key={course.id}
              className={course.id === selectedCourseID ? "active tab" : "tab"}
            >
              {course.name}
            </button>
          ))}
        </div>
      </div>
      <ResourceTable courseID={selectedCourseID} />
    </div>
  );
};

export default Resources;
