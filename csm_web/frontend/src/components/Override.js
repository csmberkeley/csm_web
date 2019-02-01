import React from "react";
import * as Cookies from "js-cookie";
import moment from "moment";

// indicies correspond to moment.day()
const DAYS_OF_WEEK = ["SU", "M", "TU", "W", "TH", "F", "SA"];

class Override extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: null,
      startTime: null,
      date: null
    };
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleInputChange(event) {
    const { name, value } = event.target;
    this.setState({ [name]: value });
  }

  handleSubmit(event) {
    event.preventDefault();
    const datetime = moment(`${this.state.date} ${this.state.startTime}`);
    const spacetime = {
      location: this.state.location,
      start_time: datetime.format("HH:mm:ss"),
      day_of_week_value: DAYS_OF_WEEK[datetime.day()]
    };
    const data = {
      spacetime: spacetime,
      week_start: datetime.startOf("week").format("YYYY-MM-DD"),
      section: this.props.sectionID
    };
    console.log(JSON.stringify(data));
    fetch("/scheduler/overrides/", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRFToken": Cookies.get("csrftoken"),
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }).then(() =>
      UIkit.modal(document.getElementById("override-modal")).hide()
    );
  }

  render() {
    const inputParameters = [
      ["Location", "location", "text"],
      ["Start time", "startTime", "time"],
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
