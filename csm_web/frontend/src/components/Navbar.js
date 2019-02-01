import React from "react";
import { Link } from "react-router-dom";
import { SectionSummary } from "./Section";

function SectionDropdownEntry(props) {
  return (
    <div>
      <h5 style={{ margin: "0px" }}>{props.section.courseName}</h5>
      <p style={{ margin: "0px" }}>
        {props.section.defaultSpacetime.location}{" "}
        {props.section.defaultSpacetime.startTime} -{" "}
        {props.section.defaultSpacetime.endTime}
      </p>
    </div>
  );
}

function Navbar(props) {
  const sectionListEntries = Object.entries(props.sections).map(
    (entry, index) => {
      const [id, section] = entry;
      return (
        <li key={index}>
          <Link to={`/sections/${id}`}>
            <SectionDropdownEntry section={section} />
          </Link>
        </li>
      );
    }
  );

  const courseListEntries = Object.keys(props.courses).map(course => (
    <li key={course}>
      <Link to={`/courses/${course}`}>
        <h4>{course.toUpperCase()}</h4>
      </Link>
    </li>
  ));

  return (
    <nav className="uk-navbar-container" data-uk-navbar="delay-hide: 200">
      <div className="uk-navbar-right">
        <ul className="uk-navbar-nav">
          <li className="uk-active">
            <a href="#">Sections</a>
            <div className="uk-navbar-dropdown uk-width-large">
              <ul className="uk-nav uk-navbar-dropdown-nav uk-list-striped">
                {sectionListEntries}
              </ul>
            </div>
          </li>
          <li>
            <a href="#">Courses</a>
            <div className="uk-navbar-dropdown">
              <ul className="uk-nav uk-navbar-dropdown-nav">
                {courseListEntries}
              </ul>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
