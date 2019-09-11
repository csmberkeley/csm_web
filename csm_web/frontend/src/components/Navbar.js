import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";

const profileShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  sectionId: PropTypes.number.isRequired,
  course: PropTypes.string.isRequired
});

export default class Navbar extends React.Component {
  static propTypes = {
    studentProfiles: PropTypes.arrayOf(profileShape).isRequired,
    mentorProfiles: PropTypes.arrayOf(profileShape).isRequired
  };

  render() {
    return (
      <nav id="navbar">
        <div className="logo-container">
          <Link to="/">
            <img src="static/frontend/img/logo-min/logo_notext.png" style={{ height: "3em" }} />
          </Link>
        </div>
      </nav>
    );
  }
}
