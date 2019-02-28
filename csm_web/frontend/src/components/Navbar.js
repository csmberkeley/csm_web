import React from "react";
import { Link } from "react-router-dom";
import moment from "moment";

function SectionDropdownEntry(props) {
  const displayTime = moment(
    props.section.defaultSpacetime.startTime,
    "HH:mm:ss"
  ).format("hh:mm A");
  return (
    <div className="section-dropdown-entry">
      <h3 className="section-dropdown-entry-course-label">
        {props.section.courseName}
      </h3>
      <p className="section-dropdown-entry-time">
        {props.section.defaultSpacetime.dayOfWeek} {displayTime}
      </p>
    </div>
  );
}

function Navbar(props) {
  const sectionListEntries = Object.entries(props.sections).map(entry => {
    const [id, section] = entry;
    return (
      <li key={id}>
        <Link to={`/sections/${id}`}>
          <SectionDropdownEntry section={section} />
        </Link>
      </li>
    );
  });

  return (
    <div uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky">
      <nav
        id="navbar"
        uk-navbar="true"
        className="uk-navbar-container"
        data-uk-navbar="delay-hide: 200"
      >
        <div className="logo-container uk-navbar-item">
          <img
            className="logo-img uk-logo"
            src="static/frontend/img/logo-min/logo_notext_white.png"
          />
        </div>
        <div className="uk-navbar-right">
          <ul className="uk-navbar-nav">
            <li className="uk-active">
              <a id="section-btn" href="#">
                <span style={{ marginRight: `${0.2}em` }} uk-icon="menu" />{" "}
                Sections
              </a>
              <div
                id="section-dropdown"
                className="uk-navbar-dropdown"
                uk-dropdown="offset: 0; pos: bottom-right;"
              >
                <ul className="uk-nav uk-navbar-dropdown-nav">
                  {sectionListEntries}
                  <Link to={"/courses/"}>
                    <li id="section-enroll-btn">
                      <span
                        uk-icon="icon: plus; ratio: 0.8"
                        uk-icon-button="true"
                      />{" "}
                      Enroll in a section
                    </li>
                  </Link>
                </ul>
              </div>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
}

export default Navbar;
