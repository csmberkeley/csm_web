import { DateTime } from "luxon";
import React, { useState } from "react";
import { DAYS_OF_WEEK } from "../../utils/datetime";
import { useSpacetimeModifyMutation, useSpacetimeOverrideMutation } from "../../utils/queries/spacetime";
import { Spacetime } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import TimeInput from "../TimeInput";

// Styles
import "../../css/spacetime-edit.scss";

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

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    //TODO: Handle API failure
    setShowSaveSpinner(true);
    isPermanent
      ? spacetimeModifyMutation.mutate({
          dayOfWeek: day,
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
      <div id="spacetime-edit-form">
        <h2 className="spacetime-edit-form-title">Change Time and Location</h2>
        <div className="csm-form">
          <div className="mode-selection">
            <label className="form-label">Section is</label>
            <div className="form-radio-group-row">
              <label>
                <input
                  className="form-radio"
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
                  className="form-radio"
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
          <label className="form-label">
            {mode === "inperson" ? "Location" : "Video Call Link"}
            <input
              className="form-input"
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
            <label className="form-label">
              Day
              <select
                className="form-select"
                onChange={e => setDay(e.target.value)}
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
            <label className="form-label">
              Time
              <TimeInput
                className="form-date"
                onChange={e => setTime(e.currentTarget.value)}
                required
                name="time"
                value={time}
              />
            </label>
          </div>
          <div id="date-of-change-fields">
            <label className="form-label">Change for</label>
            {!editingOverride && (
              <div className="form-radio-group-col">
                <label className="form-radio-item">
                  <input
                    className="form-radio"
                    onChange={e => setIsPermanent(e.target.checked)}
                    required
                    type="radio"
                    name="isPermanent"
                    checked={!!isPermanent}
                    value="true"
                  />
                  All sections
                </label>
                <label className="form-radio-item">
                  <input
                    className="form-radio"
                    onChange={e => setIsPermanent(!e.target.checked)}
                    required
                    type="radio"
                    name="isPermanent"
                    checked={!isPermanent}
                    value=""
                  />
                  <input
                    className="form-date"
                    onChange={e => setDate(e.target.value)}
                    required={!isPermanent}
                    type="date"
                    min={today}
                    name="changeDate"
                    disabled={!!isPermanent}
                    value={isPermanent ? "" : date}
                  />
                </label>
              </div>
            )}
            {editingOverride && (
              <div className="form-radio-group-col">
                <input
                  className="form-date"
                  onChange={e => setDate(e.target.value)}
                  required={!isPermanent}
                  type="date"
                  min={today}
                  name="changeDate"
                  disabled={!!isPermanent}
                  value={isPermanent ? "" : date}
                />
              </div>
            )}
          </div>
          <div className="form-actions">
            {showSaveSpinner ? (
              <LoadingSpinner />
            ) : (
              <button className="primary-btn" onClick={handleSubmit}>
                Save
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SpaceTimeEditModal;
