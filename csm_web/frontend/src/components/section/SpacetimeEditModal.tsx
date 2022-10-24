import React, { useState } from "react";
import { useSpacetimeModifyMutation, useSpacetimeOverrideMutation } from "../../utils/queries/spacetime";
import { Spacetime } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import TimeInput from "../TimeInput";
import { DAYS_OF_WEEK, zeroPadTwoDigit } from "./utils";

interface SpacetimeEditModalProps {
  sectionId: number;
  closeModal: () => void;
  defaultSpacetime: Spacetime;
  reloadSection: () => void;
  editingOverride: boolean;
}

const SpaceTimeEditModal = ({
  sectionId,
  closeModal,
  defaultSpacetime: { id: spacetimeId, startTime: timeString, location: prevLocation, dayOfWeek },
  reloadSection,
  editingOverride
}: SpacetimeEditModalProps): React.ReactElement => {
  const sliceIndex = timeString.split(":").length < 3 ? timeString.indexOf(":") : timeString.lastIndexOf(":");
  const [location, setLocation] = useState<Spacetime["location"]>(prevLocation);
  const [day, setDay] = useState<Spacetime["dayOfWeek"]>(dayOfWeek);
  const [time, setTime] = useState<Spacetime["time"]>(timeString.slice(0, sliceIndex));
  const [isPermanent, setIsPermanent] = useState<boolean>(false);
  const [date, setDate] = useState<string>("");
  const [mode, setMode] = useState<string>(prevLocation && prevLocation.startsWith("http") ? "virtual" : "inperson");
  const [showSaveSpinner, setShowSaveSpinner] = useState<boolean>(false);

  const spacetimeModifyMutation = useSpacetimeModifyMutation(sectionId, spacetimeId);
  const spacetimeOverrideMutation = useSpacetimeOverrideMutation(sectionId, spacetimeId);

  const handleSubmit = (e: React.ChangeEvent<HTMLFormElement>) => {
    e.preventDefault();
    //TODO: Handle API failure
    setShowSaveSpinner(true);
    isPermanent
      ? spacetimeModifyMutation.mutate({
          day_of_week: day,
          location: location,
          start_time: `${time}:00`
        })
      : spacetimeOverrideMutation.mutate({
          location: location,
          start_time: `${time}:00`,
          date: date
        });
    closeModal();
    reloadSection();
  };

  const now = new Date();
  const today = `${now.getFullYear()}-${zeroPadTwoDigit(now.getMonth() + 1)}-${zeroPadTwoDigit(now.getDate())}`;

  return (
    <Modal className="spacetime-edit-modal" closeModal={closeModal}>
      <form className="csm-form" id="spacetime-edit-form" onSubmit={handleSubmit}>
        <h4>Change Time and Location</h4>
        <div className="mode-selection">
          <label>Section is</label>
          <div className="mode-selection-options">
            <label>
              <input
                onChange={e => setMode(e.target.value)}
                type="radio"
                name="mode"
                value="inperson"
                checked={mode === "inperson"}
              />
              In person
            </label>
            <label>
              <input
                onChange={e => setMode(e.target.value)}
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
            onChange={e => setLocation(e.target.value)}
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
              onChange={e => setDay(e.target.value)}
              required={!!isPermanent}
              name="day"
              disabled={!isPermanent}
              value={isPermanent ? day : "---"}
            >
              {["---"].concat(Array.from(DAYS_OF_WEEK)).map(value => (
                <option key={value} value={value} disabled={value === "---"}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label>
            Time
            <TimeInput onChange={e => setTime(e.currentTarget.value)} required name="time" value={time} />
          </label>
        </div>
        <div id="date-of-change-fields">
          <label>Change for</label>
          {!editingOverride && (
            <React.Fragment>
              <label>
                <input
                  onChange={e => setIsPermanent(e.target.checked)}
                  required
                  type="radio"
                  name="isPermanent"
                  checked={!!isPermanent}
                  value="true"
                />
                All sections
              </label>
              <input
                onChange={e => setIsPermanent(!e.target.checked)}
                required
                type="radio"
                name="isPermanent"
                checked={!isPermanent}
                value=""
              />
              <input
                onChange={e => setDate(e.target.value)}
                required={!isPermanent}
                type="date"
                min={today}
                name="changeDate"
                disabled={!!isPermanent}
                value={isPermanent ? "" : date}
              />
              <label></label>
            </React.Fragment>
          )}
          {editingOverride && (
            <React.Fragment>
              <input
                onChange={e => setDate(e.target.value)}
                required={!isPermanent}
                type="date"
                min={today}
                name="changeDate"
                disabled={!!isPermanent}
                value={isPermanent ? "" : date}
              />
            </React.Fragment>
          )}
        </div>
        <div id="submit-and-status">{showSaveSpinner ? <LoadingSpinner /> : <input type="submit" value="Save" />}</div>
      </form>
    </Modal>
  );
};

export default SpaceTimeEditModal;
