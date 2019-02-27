import React from "react";
import { fetchJSON } from "../utils/api";

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
      this.setState({students: {}});
    }
    for (let id of studentIDs) {
      fetchJSON(`profiles/${id}/?userinfo=true`)
        .then(studentInfo => {
          const { user } = studentInfo;
          this.setState((state, props) => {
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
      rosterEntries = Object.entries(this.state.students).map(
        (studentInfo, index) => {
          const [id, studentDetails] = studentInfo;
          const [name, email] = studentDetails;

          return (
            <li key={id}>
              {name} - <a href={`mailto:${email}`}>{email}</a>
            </li>
          );
        }
      );
    } else {
      rosterEntries = [<p>Loading...</p>];
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
        <div id="roster-modal" data-uk-modal>
          <div className="uk-modal-dialog uk-modal-body">
            <button
              className="uk-modal-close"
              type="button"
              style={{ float: "right" }}
              data-uk-icon="icon: close"
            >
              {" "}
            </button>
            <h2 className="uk-modal-title" style={{ marginTop: "0px" }}>
              Roster
            </h2>
            <ul className="uk-list">{rosterEntries}</ul>
          </div>
        </div>
      </div>
    );
  }
}

export default Roster;
