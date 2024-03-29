import React, { useEffect, useState } from "react";

import { DAYS_OF_WEEK } from "../../utils/datetime";
import { useUserEmails } from "../../utils/queries/base";
import { useSectionCreateMutation } from "../../utils/queries/sections";
import { Spacetime } from "../../utils/types";
import Modal from "../Modal";
import TimeInput from "../TimeInput";

import ExclamationCircle from "../../../static/frontend/img/exclamation-circle.svg";

const makeSpacetime = (): Spacetime => {
  return { id: -1, duration: 0, dayOfWeek: 1, startTime: "", location: "" };
};

interface CreateSectionModalProps {
  courseId: number;
  closeModal: () => void;
  reloadSections: () => void;
}

/**
 * Modal that coords use to create a new section.
 */
export const CreateSectionModal = ({ courseId, closeModal, reloadSections }: CreateSectionModalProps) => {
  /**
   * List of all user emails (for assigning a mentor).
   */
  const { data: userEmails, isSuccess: userEmailsLoaded } = useUserEmails();
  /**
   * Mutation to create a new section.
   */
  const createSectionMutation = useSectionCreateMutation();

  /**
   * Selected mentor email for the new section.
   */
  const [mentorEmail, setMentorEmail] = useState<string>("");
  /**
   * Spacetimes for the new section.
   */
  const [spacetimes, setSpacetimes] = useState<Spacetime[]>([makeSpacetime()]);
  /**
   * Description for the new section.
   */
  const [description, setDescription] = useState<string>("");
  /**
   * Capacity for the new section.
   */
  const [capacity, setCapacity] = useState<number>(0);

  /**
   * Validation text; if empty string, no validation text is displayed.
   */
  const [validationText, setValidationText] = useState<string>("");

  /**
   * Automatically re-validate form if there was a previous validation error.
   */
  useEffect(() => {
    if (validationText !== "") {
      validateSectionForm();
    }
  }, [mentorEmail, spacetimes, description, capacity]);

  /**
   * Create a new empty spacetime for the new section.
   */
  const appendSpacetime = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Annoyingly the submit event for the form gets fired, so we have to suppress it
    setSpacetimes(oldSpacetimes => [...oldSpacetimes, makeSpacetime()]);
  };

  /**
   * Validate current spacetime values.
   */
  const validateSectionForm = (): boolean => {
    // all fields must be filled out
    if (mentorEmail === null || mentorEmail.trim() === "") {
      setValidationText("Mentor email must not be blank");
      return false;
    } else if (spacetimes.length === 0) {
      setValidationText("Must have at least one section time");
      return false;
    } else if (isNaN(capacity) || capacity < 0) {
      setValidationText("Capacity must be non-negative");
      return false;
    }

    // validate spacetime fields
    for (const spacetime of spacetimes) {
      if (spacetime.location === null || spacetime.location === undefined || spacetime.location.trim() === "") {
        setValidationText("All section locations must be specified");
        return false;
      } else if (spacetime.dayOfWeek <= 0) {
        setValidationText("All section occurrences must have a specified day of week");
        return false;
      } else if (spacetime.startTime.trim() === "") {
        setValidationText("All section occurrences must have a specified start time");
        return false;
      } else if (isNaN(spacetime.duration) || spacetime.duration <= 0) {
        setValidationText("All section occurrences must have duration greater than 0");
        return false;
      }
    }

    // all valid
    setValidationText("");
    return true;
  };

  /**
   * Handle the change of a form field.
   */
  const handleChange = (index: number, name: string, value: string): void => {
    if (name === "location" || name === "startTime" || name === "dayOfWeek" || name === "duration") {
      setSpacetimes(oldSpacetimes => {
        const newSpacetimes = [...oldSpacetimes];
        if (name === "dayOfWeek" || name === "duration") {
          // day of week is int
          newSpacetimes[index][name] = parseInt(value);
        } else {
          newSpacetimes[index][name] = value;
        }
        return newSpacetimes;
      });
    } else {
      switch (name) {
        case "mentorEmail":
          setMentorEmail(value);
          break;
        case "description":
          setDescription(value);
          break;
        case "capacity":
          setCapacity(parseInt(value));
          break;
        default:
          console.error("Unknown input name: " + name);
          break;
      }
    }
  };

  /**
   * Handle form submission.
   */
  const handleSubmit = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();

    if (!validateSectionForm()) {
      // don't do anything if invalid
      return;
    }

    const data = {
      mentorEmail,
      spacetimes,
      description,
      capacity,
      courseId
    };

    createSectionMutation.mutate(data, {
      onSuccess: () => {
        closeModal();
        reloadSections();
      },
      onError: () => {
        setValidationText("Error occurred on create");
      }
    });
  };

  return (
    <Modal className="create-section-modal" closeModal={closeModal}>
      <form id="create-section-form" className="csm-form">
        <div id="create-section-form-contents">
          <div id="non-spacetime-fields">
            <label className="form-label">
              Mentor Email
              <input
                onChange={e => handleChange(-1, "mentorEmail", e.target.value)}
                className="form-input"
                type="email"
                list="user-email-list"
                required
                name="mentorEmail"
                pattern=".+@berkeley.edu$"
                title="Please enter a valid @berkeley.edu email address"
                value={mentorEmail}
                autoFocus
              />
              <datalist id="user-email-list">
                {userEmailsLoaded ? userEmails.map(email => <option key={email} value={email} />) : null}
              </datalist>
            </label>
            <label className="form-label">
              Capacity
              <input
                className="form-input"
                required
                name="capacity"
                type="number"
                min="0"
                inputMode="numeric"
                pattern="[0-9]+"
                value={isNaN(capacity) ? "" : capacity.toString()}
                onChange={e => handleChange(-1, "capacity", e.target.value)}
              />
            </label>
            <label className="form-label">
              Description
              <input
                className="form-input"
                name="description"
                type="text"
                value={description}
                onChange={e => handleChange(-1, "description", e.target.value)}
              />
            </label>
          </div>
          {spacetimes.map(({ dayOfWeek, startTime, location, duration }, index) => (
            <React.Fragment key={index}>
              <h4 className="spacetime-fields-header">Weekly occurence {index + 1}</h4>
              <div className="spacetime-fields">
                <label className="form-label">
                  Location
                  <input
                    className="form-input"
                    onChange={e => handleChange(index, "location", e.target.value)}
                    required
                    title="You cannot leave this field blank"
                    pattern=".*[^\s]+.*"
                    type="text"
                    name={`location|${index}`}
                    value={location}
                  />
                </label>
                <label className="form-label">
                  Day
                  <select
                    className="form-select"
                    onChange={e => handleChange(index, "dayOfWeek", e.target.value)}
                    name={`dayOfWeek|${index}`}
                    value={dayOfWeek.toString()}
                    required
                  >
                    {[["---", -1], ...Array.from(DAYS_OF_WEEK)].map(([label, value]) => (
                      <option key={value} value={value} disabled={label === "---"}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  Time
                  <TimeInput
                    className="form-date"
                    onChange={e => handleChange(index, "startTime", e.target.value)}
                    required
                    name={`startTime|${index}`}
                    value={startTime}
                  />
                </label>
                <label className="form-label">
                  Duration (min)
                  <input
                    className="form-input"
                    type="number"
                    name={`duration|${index}`}
                    value={isNaN(duration) ? "" : duration.toString()}
                    min={0}
                    onChange={e => handleChange(index, "duration", e.target.value)}
                  />
                </label>
              </div>
            </React.Fragment>
          ))}
        </div>
      </form>
      <div className="create-section-submit-container">
        {validationText !== "" && (
          <div className="create-section-validation-text-container">
            <ExclamationCircle className="icon outline" />
            <span className="create-section-validation-text">{validationText}</span>
          </div>
        )}
        <button className="secondary-btn" id="add-occurence-btn" onClick={appendSpacetime}>
          Add another occurence
        </button>
        <button className="primary-btn" onClick={handleSubmit}>
          Submit
        </button>
      </div>
    </Modal>
  );
};
