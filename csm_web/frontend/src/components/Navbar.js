import React from "react";
import { Link } from "react-router-dom";
import { SectionSummary } from "./Section";
import moment from "moment";

function SectionDropdownEntry(props) {
  const displayTime = moment(
    props.section.defaultSpacetime.startTime,
    "HH:mm:ss"
  ).format("hh:mm A");
  return (
    <div class="section-dropdown-entry">
      <h3 class="section-dropdown-entry-course-label">
        {props.section.courseName}
      </h3>
      <p class="section-dropdown-entry-time">
        {props.section.defaultSpacetime.dayOfWeek} {displayTime}
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
    <div uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky">
      <nav
        id="navbar"
        uk-navbar="true"
        className="uk-navbar-container"
        data-uk-navbar="delay-hide: 200"
      >
        <div class="logo-container uk-navbar-item">
          <img
            class="logo-img uk-logo"
            src="static/frontend/img/logo_white.png"
          />
        </div>
        <div className="uk-navbar-right">
          <ul className="uk-navbar-nav">
            <li className="uk-active">
              <a id="section-btn" href="#">
                Sections
              </a>
              <div
                id="section-dropdown"
                className="uk-navbar-dropdown"
                uk-dropdown="offset: 0"
              >
                <ul className="uk-nav uk-navbar-dropdown-nav">
                  {sectionListEntries}
                  <li id="section-enroll-btn">
                    <i class="fa fa-plus" aria-hidden="true" /> Enroll in a
                    section
                  </li>
                </ul>
              </div>
            </li>
            {/*
          <li>
            <a href="#">Courses</a>
            <div className="uk-navbar-dropdown">
              <ul className="uk-nav uk-navbar-dropdown-nav">
                {courseListEntries}
              </ul>
            </div>
          </li>
          */}
          </ul>
        </div>
      </nav>
    </div>
  );
}

export default Navbar;
