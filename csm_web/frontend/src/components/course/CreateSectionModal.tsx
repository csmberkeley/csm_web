import React, { useState } from "react";
import { useUserEmails } from "../../utils/queries/base";
import { useSectionCreateMutation } from "../../utils/queries/sections";
import { Spacetime } from "../../utils/types";
import Modal from "../Modal";
import { DAYS_OF_WEEK } from "../section/utils";
import TimeInput from "../TimeInput";

const makeSpacetime = (): Spacetime => {
  return { dayOfWeek: "", startTime: "", location: "" } as Spacetime;
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
  const [capacity, setCapacity] = useState<string>("");

  /**
   * Create a new empty spacetime for the new section.
   */
  const appendSpacetime = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Annoyingly the submit event for the form gets fired, so we have to suppress it
    setSpacetimes(oldSpacetimes => [...oldSpacetimes, makeSpacetime()]);
  };

  /**
   * Handle the change of a form field.
   */
  const handleChange = ({ target: { name, value } }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void => {
    if (name.startsWith("location") || name.startsWith("startTime") || name.startsWith("dayOfWeek")) {
      // Funny JavaScript scoping workaround (let [name, index] = name.split("|") doesn't work)
      let index;
      [name, index] = name.split("|");
      index = Number(index);
      setSpacetimes([
        ...spacetimes.slice(0, index),
        { ...spacetimes[index], [name]: value },
        ...spacetimes.slice(index + 1)
      ]);
    } else {
      switch (name) {
        case "mentorEmail":
          setMentorEmail(value);
          break;
        case "description":
          setDescription(value);
          break;
        case "capacity":
          setCapacity(value);
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
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
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
      }
    });
  };

  return (
    <Modal closeModal={closeModal}>
      <form id="create-section-form" className="csm-form" onSubmit={handleSubmit}>
        <div id="create-section-form-contents">
          <div id="non-spacetime-fields">
            <label>
              Mentor Email
              <input
                onChange={handleChange}
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
            <label>
              Capacity
              <input
                required
                name="capacity"
                type="number"
                min="0"
                inputMode="numeric"
                pattern="[0-9]*"
                value={capacity}
                onChange={handleChange}
              />
            </label>
            <label>
              Description
              <input name="description" type="text" value={description} onChange={handleChange} />
            </label>
          </div>
          {spacetimes.map(({ dayOfWeek, startTime, location }, index) => (
            <React.Fragment key={index}>
              <h4 className="spacetime-fields-header">Weekly occurence {index + 1}</h4>
              <div className="spacetime-fields">
                <label>
                  Location
                  <input
                    onChange={handleChange}
                    required
                    title="You cannot leave this field blank"
                    pattern=".*[^\s]+.*"
                    type="text"
                    name={`location|${index}`}
                    value={location}
                  />
                </label>
                <label>
                  Day
                  <select onChange={handleChange} name={`dayOfWeek|${index}`} value={dayOfWeek} required>
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
                    onChange={handleChange as React.FormEventHandler<HTMLInputElement>}
                    required
                    name={`startTime|${index}`}
                    value={startTime}
                  />
                </label>
                {index === spacetimes.length - 1 && (
                  <button className="csm-btn" id="add-occurence-btn" onClick={appendSpacetime}>
                    Add another occurence
                  </button>
                )}
              </div>
            </React.Fragment>
          ))}
          <input type="submit" value="Create Section" />
        </div>
      </form>
    </Modal>
  );
};
