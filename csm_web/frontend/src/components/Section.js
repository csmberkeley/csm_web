import React from "react";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";
import SectionDetail from "./SectionDetail";
import { AsStudentAttendance, AsMentorAttendance } from "./Attendance";

export default class Section extends React.Component {
  constructor(props) {
    super(props);
    this.state = { ready: false };
    this.fetchInfo = this.fetchInfo.bind(this);
  }

  static propTypes = {
    match: PropTypes.object,
    isMentor: PropTypes.bool,
    currentProfileId: PropTypes.number
  };

  fetchInfo() {
    Promise.all([
      fetchJSON(this.props.match.url).then(sectionInfo => this.setState({ sectionInfo: sectionInfo })),
      this.props.isMentor
        ? fetchJSON(`${this.props.match.url}/students`).then(students => this.setState({ students }))
        : fetchJSON(`/students/${this.props.currentProfileId}/attendances`).then(attendances =>
            this.setState({ attendances })
          )
    ]).then(() => this.setState({ ready: true }));
  }

  componentDidMount() {
    this.fetchInfo();
  }

  render() {
    return (
      <div>
        {/* Displays section info */}
        <h2>Section</h2>
        {this.state.ready && (
          <SectionDetail
            sectionInfo={this.state.sectionInfo}
            isStudent={!this.props.isMentor}
            profileId={this.props.currentProfileId}
          />
        )}
        {/* Displays attendances*/}
        {this.state.ready ? (
          <React.Fragment>
            <h4>Attendances</h4>
            <div>
              {this.props.isMentor ? (
                <AsMentorAttendance students={this.state.students} />
              ) : (
                <AsStudentAttendance attendances={this.state.attendances} />
              )}
            </div>
          </React.Fragment>
        ) : (
          <div>Loading attendances...</div>
        )}
      </div>
    );
  }
}
