import React from "react";
import { fetchWithMethod, HTTP_METHODS } from "../utils/api";
import { Modal } from "../utils/common.js";

class DropSection extends React.Component {
  constructor(props) {
    super(props);
    this.handleDrop = this.handleDrop.bind(this);
  }

  handleDrop() {
    return fetchWithMethod(
      `profiles/${this.props.profileID}/unenroll`,
      HTTP_METHODS.DELETE
    ).then(response => {
      if (response.ok) {
        UIkit.modal(document.getElementById("confirm-drop-modal")).hide();
        UIkit.modal(document.getElementById("drop-successful-modal")).show();
        setTimeout(() => location.reload(true), 2500);
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
        <Modal id="drop-modal" title="Settings">
          <button
            className="uk-button uk-button-danger uk-modal-close"
            data-uk-toggle="target: #confirm-drop-modal"
          >
            Drop Section
          </button>
        </Modal>
        <Modal id="confirm-drop-modal" title="Are you sure?">
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
        </Modal>
        <Modal id="drop-successful-modal" title="Section dropped">
          You have succesfully dropped the section.
          <button
            style={{ margin: "5px 5px 5px 0px", display: "block" }}
            className="uk-button uk-button-primary uk-modal-close"
          >
            OK
          </button>
        </Modal>
      </div>
    );
  }
}

export default DropSection;
