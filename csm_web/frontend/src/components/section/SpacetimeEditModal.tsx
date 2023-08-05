import { DateTime } from "luxon";
import React, { useState } from "react";
import { DAYS_OF_WEEK } from "../../utils/datetime";
import { useSpacetimeModifyMutation, useSpacetimeOverrideMutation } from "../../utils/queries/spacetime";
import { Spacetime } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import TimeInput from "../TimeInput";

interface SpacetimeEditModalProps {
  sectionId: number;
  closeModal: () => void;
  defaultSpacetime: Spacetime;
  editingOverride: boolean;
}

const SpaceTimeEditModal = ({
  sectionId,
  closeModal,
  defaultSpacetime: { id: spacetimeId, startTime: timeString, location: prevLocation, dayOfWeek },
  editingOverride
}: SpacetimeEditModalProps): React.ReactElement => {
  const [location, setLocation] = useState<Spacetime["location"]>(prevLocation);
  const [day, setDay] = useState<Spacetime["dayOfWeek"]>(dayOfWeek);
  const [time, setTime] = useState<Spacetime["startTime"]>(timeString);
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
          dayOfWeek,
          location: location,
          startTime: time
        })
      : spacetimeOverrideMutation.mutate({
          location: location,
          startTime: time,
          date: date
        });
    closeModal();
  };

  const today = DateTime.now().toISODate()!;

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
              onChange={e => setDay(parseInt(e.target.value))}
              required={!!isPermanent}
              name="day"
              disabled={!isPermanent}
              value={isPermanent ? day : "---"}
            >
              {[["---", ""], ...Array.from(DAYS_OF_WEEK)].map(([label, value]) => (
                <option key={value} value={value} disabled={value === "---"}>
                  {label}
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
