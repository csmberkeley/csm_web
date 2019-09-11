import React from "react";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";

const profileShape = PropTypes.shape({
  section: PropTypes.number.isRequired
});

export default class Navbar extends React.Component {
  static propTypes = {
    studentProfiles: PropTypes.arrayOf(profileShape).isRequired,
    mentorProfiles: PropTypes.arrayOf(profileShape).isRequired
  };

  constructor(props) {
    super(props);
    this.state = { ready: false };
    this.fetchSectionInfo = this.fetchSectionInfo.bind(this);
  }

  componentDidMount() {
    this.fetchSectionInfo();
  }

  fetchSectionInfo() {
    Promise.all([
      Promise.all(this.props.mentorProfiles.map(profile => fetchJSON(`sections/${profile.section}`))).then(sections =>
        this.setState({ mentorSections: sections })
      ),
      Promise.all(this.props.studentProfiles.map(profile => fetchJSON(`sections/${profile.section}`))).then(sections =>
        this.setState({ studentSections: sections })
      )
    ]).then(() => this.setState({ ready: true }));
  }

  render() {
    let ready = this.state.ready;
    let makeSectionLink = section => (
      <li key={section.id}>
        <NavLink to={`/sections/${section.id}`}>
          {section.course} ({section.time})
        </NavLink>
      </li>
    );
    let studentSectionElems = this.state.studentSections && this.state.studentSections.map(makeSectionLink);
    let mentorSectionElems = this.state.mentorSections && this.state.mentorSections.map(makeSectionLink);
    return (
      <nav id="header">
        <ol>
          <li className="logo-container">
            <NavLink to="/">
              <img src="static/frontend/img/logo-min/logo_notext.png" style={{ height: "3em" }} />
            </NavLink>
          </li>
        </ol>
        <ol>
          <li>
            <NavLink to="/courses">Enroll in a section</NavLink>
          </li>
        </ol>
        {ready && this.state.mentorSections.length > 0 && (
          <ol>
            <li>
              <i>Sections I teach:</i>
            </li>
            {mentorSectionElems}
          </ol>
        )}
        {ready && this.state.studentSections.length > 0 && (
          <ol>
            <li>
              <i>Sections I&apos;m enrolled in:</i>
            </li>
            {studentSectionElems}
          </ol>
        )}
      </nav>
    );
  }
}
