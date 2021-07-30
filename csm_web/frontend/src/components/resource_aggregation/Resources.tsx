import React, {useState, useEffect} from "react";
import { fetchJSON } from "../../utils/api";
import ResourceWrapper from "./ResourceWrapper.tsx";


const Resources = () => {
  const [selectedCourseID, setSelectedCourseID] = useState(1);
  const [courses, setCourses] = useState([]);
  // TODO: have mapping of course id to resource list to store previous gets

  useEffect(() => {
    fetchJSON("courses").then(data => {
      setCourses(data);
    });
  }, []);

  const handleTabClick = (courseID) => {
    console.log("on click works");
    setSelectedCourseID(courseID);
  }

  return (
    <div>
      <div className="tabs">
        <ul className="tab-list">
          {
            courses.map((course) => (
              <li
                onClick={() => handleTabClick(course.id)}
                key={course.id}
                className={course.id === selectedCourseID ? "active": ""}
              >
                {course.name}
              </li>
            ))
          }
        </ul>
      </div>
      <ResourceWrapper courseID={selectedCourseID}/>
    </div>
  )
}

export default Resources;