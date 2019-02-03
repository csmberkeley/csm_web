import React from "react";
import { Link } from "react-router-dom";

function CourseNav(props) {
  const courseListEntries = Object.keys(props.courses).map(course => (
    <li key={course}>
      <Link to={`/courses/${course}`}>
        <h4>{course.toUpperCase()}</h4>
      </Link>
    </li>
  ));
  return <ul class="uk-list uk-list-divider">{courseListEntries}</ul>;
}

export default CourseNav;
