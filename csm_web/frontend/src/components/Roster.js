import React from "react";

class Roster extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    for (let id of this.props.studentIDs) {
      fetch(`/scheduler/profiles/${id}/?userinfo=true`)
        .then(response => response.json())
        .then(studentInfo => {
          const { user } = studentInfo;
          this.setState((state, props) => ({
            [id]: [`${user.firstName} ${user.lastName}`, user.email],
            ...state
          }));
        });
    }
  }

  render() {
    const rosterEntries = Object.entries(this.state).map(
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
