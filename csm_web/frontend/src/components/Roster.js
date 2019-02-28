import React from "react";
import { fetchJSON } from "../utils/api";
import { Modal } from "../utils/common.js";

class Roster extends React.Component {
  constructor(props) {
    super(props);
    this.state = { currentSectionID: props.sectionID, students: null }; // will contain entries of the form studentID: [studentName, studentEmail]
  }

  static getDerivedStateFromProps(state, props) {
    if (props.sectionID !== state.currentSectionID) {
      return { currentSectionID: props.sectionID, students: null };
    }
    return null; // does not update state
  }

  loadStudentInfo(studentIDs) {
    if (studentIDs.length === 0) {
      this.setState({ students: {} });
    }
    for (let id of studentIDs) {
      fetchJSON(`profiles/${id}/?userinfo=true`).then(studentInfo => {
        const { user } = studentInfo;
        this.setState(state => {
          if (state.students === null) {
            return {
              students: {
                [id]: [`${user.firstName} ${user.lastName}`, user.email]
              }
            };
          } else {
            return {
              students: {
                [id]: [`${user.firstName} ${user.lastName}`, user.email],
                ...state.students
              }
            };
          }
        });
      });
    }
  }

  componentDidMount() {
    this.loadStudentInfo(this.props.studentIDs);
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.students === null) {
      this.loadStudentInfo(this.props.studentIDs);
    }
  }

  render() {
    var rosterEntries;
    if (this.state.students !== null) {
      rosterEntries = Object.entries(this.state.students).map(studentInfo => {
        const [id, studentDetails] = studentInfo;
        const [name, email] = studentDetails;

        return (
          <li key={id}>
            {name} - <a href={`mailto:${email}`}>{email}</a>
          </li>
        );
      });
    } else {
      rosterEntries = [<p key="loading">Loading...</p>]; // key specified just to get rid of warning
    }
    return (
      <div>
        <button
          className="uk-button uk-button-default"
          type="button"
          style={{ float: "right", clear: "right", width: "150px" }}
          data-uk-toggle="target: #roster-modal"
        >
          Show Roster
        </button>
        <Modal id="roster-modal" title="Roster">
          <ul className="uk-list">{rosterEntries}</ul>
        </Modal>
      </div>
    );
  }
}

export default Roster;
