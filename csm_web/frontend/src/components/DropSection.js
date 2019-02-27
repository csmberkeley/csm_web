import React from "react";
import { fetchWithMethod } from "../utils/api";

class DropSection extends React.Component {
  constructor(props) {
    super(props);
    this.handleDrop = this.handleDrop.bind(this);
  }

  handleDrop() {
    return fetchWithMethod(
      `profiles/${this.props.profileID}/uneroll/`,
      "DELETE"
    ).then(response => {
      if (response.ok) {
        UIkit.modal(document.getElementById("confirm-drop-modal")).hide();
        UIkit.modal(document.getElementById("drop-successful-modal"))
          .show()
          .then(() => {
            location.reload(true);
          });
      }
    });
  }

  render() {
    return (
      <div>
        <a
          href=""
          data-uk-icon="icon: cog; ratio: 1.5"
          style={{ float: "right" }}
          className="uk-button uk-button-link"
          title="Settings"
          data-uk-toggle="target: #drop-modal"
        />
        <div id="drop-modal" data-uk-modal="stack: true">
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
              Settings
            </h2>
            <button
              className="uk-button uk-button-danger uk-modal-close"
              data-uk-toggle="target: #confirm-drop-modal"
            >
              Drop Section
            </button>
          </div>
        </div>
        <div id="confirm-drop-modal" data-uk-modal="stack: true">
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
              Are you sure?
            </h2>
            <p>
              You are about to drop this section, you will no longer be enrolled
              as a student. Are you sure this is what you want to do?
            </p>
            <div>
              <button
                className="uk-button uk-button-danger"
                style={{ float: "right" }}
                onClick={this.handleDrop}
              >
                Yes, drop this section
              </button>
              <button className="uk-button uk-button-default uk-modal-close">
                Cancel
              </button>
            </div>
          </div>
        </div>
        <div id="drop-successful-modal" data-uk-modal="stack: true">
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
              Section dropped
            </h2>
            You have succesfully dropped the section.
            <button
              style={{ margin: "5px 5px 5px 0px", display: "block" }}
              className="uk-button uk-button-primary uk-modal-close"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default DropSection;
