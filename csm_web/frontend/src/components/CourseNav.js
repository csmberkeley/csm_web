import React from "react";
import { Link } from "react-router-dom";

function CourseNav(props) {
  const courseListEntries = Object.keys(props.courses).map(course => (
    <li className="course-nav-entry" key={course}>
      <Link to={`/courses/${course}`}>
        <h4 className="course-nav-entry-text">{course.toUpperCase()}</h4>
      </Link>
    </li>
  ));
  return (
    <div id="coursenav-container">
      <h1 id="coursenav-title">Enroll in a course</h1>
      <ul className="uk-list uk-list-striped">{courseListEntries}</ul>
    </div>
  );
}

export default CourseNav;
