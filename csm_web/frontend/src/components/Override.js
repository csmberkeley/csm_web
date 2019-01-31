import React from "react";
import * as Cookies from "js-cookie";

class Override extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: null,
      startTime: null,
      duration: null,
      dayOfWeek: null,
      date: null
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    const [name, value] = [event.target.name, event.target.value];
    this.setState({ [name]: value });
  }

  handleSubmit(event) {
    event.preventDefault();
    fetch("/scheduler/overrides/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": Cookies.get("csrftoken"),
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(this.state)
    });
  }

  render() {
    const inputParameters = [
      ["Location", "location", "text"],
      ["Start time", "startTime", "time"],
      ["Duration", "duration", "number"],
      ["Date", "date", "date"]
    ];
    const inputs = inputParameters.map(parameters => {
      const [label, name, type] = parameters;
      return (
        <label>
          {label}
          <input
            name={name}
            type={type}
            onChange={this.handleInputChange}
            className="uk-input"
          />
        </label>
      );
    });

    return (
      <div>
        <button
          className="uk-button uk-button-default"
          type="button"
          style={{ float: "right" }}
          data-uk-toggle="target: #override-modal"
        >
          Override
        </button>
        <div id="override-modal" data-uk-modal>
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
              Override
            </h2>
            <form onSubmit={this.handleSubmit}>
              {inputs}
              <button className="uk-button uk-button-default uk-button-small">
                Save Override
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }
}

export default Override;
