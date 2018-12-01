import React from "react";
import { Link } from "react-router-dom";
import { SectionSummary } from "./Section";

function Navbar(props) {
  const sectionListEntries = Object.entries(props.sections).map(
    (entry, index) => {
      const [id, section] = entry;
      return (
        <li key={index}>
          <Link to={`/sections/${id}`}>
            <SectionSummary
              defaultSpacetime={section.defaultSpacetime}
              mentor={section.mentor}
            />
          </Link>
        </li>
      );
    }
  );

  return (
    <nav className="uk-navbar-container" data-uk-navbar="delay-hide: 200">
      <div className="uk-navbar-right">
        <ul className="uk-navbar-nav">
          <li className="uk-active">
            <a href="#">Sections</a>
            <div className="uk-navbar-dropdown">
              <ul className="uk-nav uk-navbar-dropdown-nav">
                {sectionListEntries}
              </ul>
            </div>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
