import React from "react";
import PropTypes from "prop-types";

import { HTTP_METHODS, fetchWithMethod } from "../utils/api";

const sectionShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  time: PropTypes.string.isRequired,
  location: PropTypes.string.isRequired,
  mentor: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired
  }),
  capacity: PropTypes.number.isRequired,
  numStudentsEnrolled: PropTypes.number.isRequired,
  description: PropTypes.string,
  course: PropTypes.string.isRequired
});

class DropButton extends React.Component {
  static propTypes = {
    sectionInfo: sectionShape.isRequired,
    profileId: PropTypes.number.isRequired
  };

  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.doDrop = this.doDrop.bind(this);
  }

  doDrop() {
    fetchWithMethod(`students/${this.props.profileId}/drop/`, HTTP_METHODS.PATCH);
  }

  handleClick() {
    let p = this.props.sectionInfo;
    let confirmed = window.confirm(
      `Are you sure you want to drop this section (${p.course}, ${p.mentor.name} on ${p.time})?`
    );
    if (confirmed) {
      this.doDrop();
      window.location.reload();
    }
  }

  render() {
    return <button onClick={this.handleClick}>Drop</button>;
  }
}

export default class SectionDetail extends React.Component {
  constructor(props) {
    super(props);
    this.copyStudentEmails = this.copyStudentEmails.bind(this);
  }

  static propTypes = {
    sectionInfo: sectionShape.isRequired,
    isStudent: PropTypes.bool.isRequired,
    profileId: PropTypes.number.isRequired,
    students: PropTypes.arrayOf(PropTypes.object)
  };

  copyStudentEmails() {
    navigator.clipboard.writeText(this.props.students.map(({ email }) => email).join(" "));
  }

  render() {
    return (
      <div>
        <h3>{this.props.sectionInfo.course}</h3>
        <div>
          <p>
            {this.props.sectionInfo.mentor.name}{" "}
            <a href={`mailto:${this.props.sectionInfo.mentor.email}`}>{this.props.sectionInfo.mentor.email}</a>
          </p>
        </div>
        <div>
          <p>{this.props.sectionInfo.time}</p>
          <p>{this.props.sectionInfo.location}</p>
          {this.props.isStudent && <DropButton sectionInfo={this.props.sectionInfo} profileId={this.props.profileId} />}
        </div>
        {!this.props.isStudent && (
          <React.Fragment>
            <h4 style={{ display: "inline" }}>Roster</h4>
            <button title="Copy student emails" className="copy-student-emails" onClick={this.copyStudentEmails}>
              <i className="far fa-copy fa-lg" />
            </button>
            <ul>
              {this.props.students.map(student => (
                <li key={student.id}>
                  {student.name} - <a href={`mailto:${student.email}`}>{student.email}</a>
                </li>
              ))}
            </ul>
          </React.Fragment>
        )}
      </div>
    );
  }
}
