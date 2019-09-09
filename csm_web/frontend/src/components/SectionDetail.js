import React from "react";
import PropTypes from "prop-types";

const sectionShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  location: PropTypes.string.isRequired,
  mentor: PropTypes.shape({
    name: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired
  }),
  capacity: PropTypes.number.isRequired,
  numStudentsEnrolled: PropTypes.number.isRequired,
  description: PropTypes.string
});

export default class SectionDetail extends React.Component {
  static propTypes = {
    sectionInfo: sectionShape.isRequired
  };

  render() {
    return (
      <div>
        <h3>[TODO COURSE] Section</h3>
        <div>
          <p>
            {this.props.sectionInfo.mentor.name}{" "}
            <a href={`mailto:${this.props.sectionInfo.mentor.email}`}>{this.props.sectionInfo.mentor.email}</a>
          </p>
        </div>
        <div>
          <p>{this.props.sectionInfo.time}</p>
          <p>{this.props.sectionInfo.location}</p>
        </div>
        <br />
        {JSON.stringify(this.props.sectionInfo)}
      </div>
    );
  }
}
