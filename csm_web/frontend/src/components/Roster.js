import React from "react";
import { fetchJSON } from "../utils/api";
import { Modal } from "../utils/common.js";

class Roster extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentSectionID: props.sectionID,
      students: null, // will contain entries of the form studentID: [studentName, studentEmail]
      emailsCopied: false
    };
    this.handleEmailCopy = this.handleEmailCopy.bind(this);
  }

  static getDerivedStateFromProps(state, props) {
    if (props.sectionID !== state.currentSectionID) {
      return { currentSectionID: props.sectionID, students: null, emailsCopied: false };
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

  handleEmailCopy() {
    this.setState(state =>{
      // Be careful with this map, as we need to make sure the function arguments
      // aren't interpreted as (value, index)
      let emailList = Object.values(state.students).map(([_, email]) => email);
      // Create fake textArea per https://stackoverflow.com/a/30810322
      let clipboardElement = document.createElement("textarea");
      clipboardElement.classList.add("clipboard-textarea");
      clipboardElement.value = emailList.join(",");
      document.body.appendChild(clipboardElement);
      clipboardElement.focus();
      clipboardElement.select();
      let newState = { emailsCopied: document.execCommand("copy") };
      document.body.removeChild(clipboardElement);
      return newState;
    });
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
          data-uk-toggle="target: #roster-modal"
					title="Show student roster"
					className="show-roster-button"
        >
					<span data-uk-icon="users"/>
        </button>
        <Modal id="roster-modal" title="Roster">
          <ul className="uk-list">{rosterEntries}</ul>
          <div data-uk-grid className="uk-grid-small">
            <button className="uk-button uk-button-default uk-button-small" onClick={this.handleEmailCopy}>
              Copy Emails
            </button>
            {this.state.emailsCopied && (
              <span
                data-uk-icon="icon: check; ratio: 1.5"
                style={{ color: "green" }}
              >
                Copied to clipboard
              </span>
            )}
          </div>
        </Modal>
      </div>
    );
  }
}

export default Roster;
