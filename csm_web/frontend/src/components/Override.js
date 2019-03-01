import React from "react";
import moment from "moment";
import { fetchWithMethod, HTTP_METHODS } from "../utils/api.js";
import { Modal } from "../utils/common.js";

// indicies correspond to moment.day()
const DAYS_OF_WEEK = ["SU", "M", "TU", "W", "TH", "F", "SA"];

class Override extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      location: null,
      startTime: null,
      date: null,
      errorMessage: null
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
    const today = moment();
    if (datetime.isBefore(today)) {
      this.setState({ errorMessage: "You must select a date in the future" });
      return;
    }
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
    fetchWithMethod("overrides/", HTTP_METHODS.POST, data)
      .then(response => {
        if (response.ok) {
          UIkit.modal(document.getElementById("override-modal")).hide();
        } else {
          this.setState({
            errorMessage:
              "Something went wrong. Please try again in a few minutes."
          });
        }
      })
      .catch(error =>
        this.setState({
          errorMessage:
            "Something went wrong. Please try again in a few minutes."
        })
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
        <label key={name}>
          {label}
          <input
            name={name}
            type={type}
            onChange={this.handleInputChange}
            className="uk-input"
            required
            autoComplete="off"
          />
        </label>
      );
    });

    return (
      <div>
        <button
          className="uk-button uk-button-default"
          type="button"
          style={{
            float: "right",
            clear: "right",
            width: "150px",
            margin: "5px 0px"
          }}
          data-uk-toggle="target: #override-modal"
        >
          Override
        </button>
        <Modal id="override-modal" title="Override">
          {this.state.errorMessage && (
            <p
              style={{
                color: "red",
                border: "red 1px solid",
                padding: "5px",
                "text-align": "center"
              }}
            >
              Error: {this.state.errorMessage}
            </p>
          )}
          <form onSubmit={this.handleSubmit}>
            {inputs}
            <button
              className="uk-button uk-button-default uk-button-small"
              style={{ marginTop: "5px" }}
            >
              Save Override
            </button>
          </form>
        </Modal>
      </div>
    );
  }
}

export default Override;
