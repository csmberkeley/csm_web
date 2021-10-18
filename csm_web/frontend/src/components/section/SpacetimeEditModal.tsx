import React from "react";
import { fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Spacetime } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import TimeInput from "../TimeInput";
import { DAYS_OF_WEEK, zeroPadTwoDigit } from "./utils";

interface SpacetimeEditModalProps {
  closeModal: () => void;
  defaultSpacetime: Spacetime;
  reloadSection: () => void;
}

interface SpacetimeEditModalState {
  location: Spacetime["location"];
  day: Spacetime["dayOfWeek"];
  time: Spacetime["time"];
  isPermanent: boolean;
  changeDate: string;
  mode: string;
  showSaveSpinner: boolean;
}

export default class SpacetimeEditModal extends React.Component<SpacetimeEditModalProps, SpacetimeEditModalState> {
  constructor(props: SpacetimeEditModalProps) {
    super(props);
    // Time string comes as HH:MM:ss, TimeInput expects HH:MM
    const timeString = props.defaultSpacetime.startTime;
    // Some extra logic in case the API changes to HH:MM,
    // in which case split would produce 2 segments instead of 3
    const sliceIndex = timeString.split(":").length < 3 ? timeString.indexOf(":") : timeString.lastIndexOf(":");
    this.state = {
      location: props.defaultSpacetime.location,
      day: props.defaultSpacetime.dayOfWeek,
      time: timeString.slice(0, sliceIndex),
      isPermanent: false,
      changeDate: "",
      // Logic to determine whether or not the location is virtual or in person (same logic as backend to omit video call links)
      mode: props.defaultSpacetime.location.startsWith("http") ? "virtual" : "inperson",
      showSaveSpinner: false
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  handleChange({ target: { name, value } }) {
    this.setState(state => ({ ...state, [name]: value }));
  }

  handleSubmit(event) {
    event.preventDefault();
    const { closeModal, defaultSpacetime, reloadSection } = this.props;
    const spacetimeId = defaultSpacetime.id;
    const { location, day, time, isPermanent, changeDate } = this.state;
    //TODO: Handle API failure
    this.setState({ showSaveSpinner: true });
    (isPermanent
      ? fetchWithMethod(`/spacetimes/${spacetimeId}/modify`, HTTP_METHODS.PUT, {
          day_of_week: day,
          location: location,
          start_time: `${time}:00`
        })
      : fetchWithMethod(`/spacetimes/${spacetimeId}/override`, HTTP_METHODS.PUT, {
          location: location,
          start_time: `${time}:00`,
          date: changeDate
        })
    ).then(() => {
      closeModal();
      reloadSection();
    });
  }

  render() {
    const { location, day, time, isPermanent, changeDate, mode, showSaveSpinner } = this.state;
    const now = new Date();
    const today = `${now.getFullYear()}-${zeroPadTwoDigit(now.getMonth() + 1)}-${zeroPadTwoDigit(now.getDate())}`;
    return (
      <Modal className="spacetime-edit-modal" closeModal={this.props.closeModal}>
        <form className="csm-form" id="spacetime-edit-form" onSubmit={this.handleSubmit}>
          <h4>Change Time and Location</h4>
          <div className="mode-selection">
            <label>Section is</label>
            <div className="mode-selection-options">
              <label>
                <input
                  onChange={this.handleChange}
                  type="radio"
                  name="mode"
                  value="inperson"
                  checked={mode === "inperson"}
                />
                In person
              </label>
              <label>
                <input
                  onChange={this.handleChange}
                  type="radio"
                  name="mode"
                  value="virtual"
                  checked={mode === "virtual"}
                />
                Virtual
              </label>
            </div>
          </div>
          <label>
            {mode === "inperson" ? "Location" : "Video Call Link"}
            <input
              onChange={this.handleChange}
              required
              title="You cannot leave this field blank"
              pattern=".*[^\s]+.*"
              type={mode === "inperson" ? "text" : "url"}
              maxLength={200}
              name="location"
              value={location}
              autoFocus
            />
          </label>
          {/* Would use a fieldset to be semantic, but Chrome has a bug where flexbox doesn't work for fieldset */}
          <div id="day-time-fields">
            <label>
              Day
              <select
                onChange={this.handleChange}
                required={isPermanent}
                name="day"
                disabled={!isPermanent}
                value={isPermanent ? day : ""}
              >
                {[["", "---"]].concat(Array.from(DAYS_OF_WEEK)).map(value => (
                  <option key={value} value={value} disabled={!value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Time
              <TimeInput onChange={this.handleChange} required name="time" value={time} />
            </label>
          </div>
          <div id="date-of-change-fields">
            <label>Change for</label>
            <label>
              <input
                onChange={this.handleChange}
                required
                type="radio"
                name="isPermanent"
                checked={isPermanent}
                value="true"
              />
              All sections
            </label>
            <label>
              {/* Need to use empty string as value so that it's falsey because the value is always interpreted as a string, using "false" would actually be a truthy value */}
              <input
                onChange={this.handleChange}
                required
                type="radio"
                name="isPermanent"
                checked={!isPermanent}
                value=""
              />
              <input
                onChange={this.handleChange}
                required={!isPermanent}
                type="date"
                min={today}
                name="changeDate"
                disabled={isPermanent}
                value={isPermanent ? "" : changeDate}
              />
            </label>
          </div>
          <div id="submit-and-status">
            {showSaveSpinner ? <LoadingSpinner /> : <input type="submit" value="Save" />}
          </div>
        </form>
      </Modal>
    );
  }
}
