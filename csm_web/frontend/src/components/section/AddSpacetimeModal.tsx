import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import Modal from "../Modal";
import { Spacetime } from "../../utils/types";
import { DAYS_OF_WEEK } from "../section/utils";
import TimeInput from "../TimeInput";

interface AddSpacetimeProps {
  sectionID: number;
  closeModal: () => void;
  reloadSections: () => void;
}

export default function AddSpacetimeModal({ sectionID, closeModal, reloadSections }: AddSpacetimeProps) {
  const [location, setLocation] = useState<string>();
  const [time, setTime] = useState<string>();
  const [day, setDay] = useState<string>("Monday");

  const handleLocation = ({
    target: { name, value }
  }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
    setLocation(value);
  };

  const handleDay = ({ target: { name, value } }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
    setDay(value);
  };

  const handleTime = ({ target: { name, value } }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
    setTime(value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const data = {
      sectionID,
      location,
      day,
      time
    };

    //TODO: Handle API Failure
    fetchWithMethod("/spacetimes", HTTP_METHODS.POST, data).then(() => {
      closeModal();
      reloadSections();
    });
  };

  return (
    <Modal className="add-spacetime-modal" closeModal={closeModal}>
      <form id="add-spacetime-form" className="csm-form" onSubmit={handleSubmit}>
        <div id="add-spacetime-form-contents">
          <React.Fragment>
            <div className="spacetime-fields">
              <label>
                Location
                <input
                  onChange={handleLocation}
                  required
                  title="You cannot leave this field blank"
                  pattern=".*[^\s]+.*"
                  type="text"
                  name={"location"}
                  value={location}
                />
              </label>
              <label>
                Day
                <select onChange={handleDay} name={`dayOfWeek`} value={day} required>
                  {["---"].concat(DAYS_OF_WEEK).map(day => (
                    <option key={day} value={day === "---" ? "" : day} disabled={day === "---"}>
                      {day}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time
                <TimeInput
                  onChange={handleTime as React.FormEventHandler<HTMLInputElement>}
                  required
                  name={`startTime`}
                  value={time}
                />
              </label>
            </div>
          </React.Fragment>
          <input type="submit" value="Create Spacetime" />
        </div>
      </form>
    </Modal>
  );
}
