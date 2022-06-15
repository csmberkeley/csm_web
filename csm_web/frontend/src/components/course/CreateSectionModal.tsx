import React from "react";
import PropTypes from "prop-types";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import Modal from "../Modal";
import { Spacetime } from "../../utils/types";
import { DAYS_OF_WEEK } from "../section/utils";
import TimeInput from "../TimeInput";

interface CreateSectionModalProps {
  courseId: number;
  closeModal: () => void;
  reloadSections: () => void;
}

interface CreateSectionModalState {
  userEmails: string[];
  mentorEmail: string;
  spacetimes: Spacetime[];
  description: string;
  capacity: string;
  courseId?: number;
}

export class CreateSectionModal extends React.Component<CreateSectionModalProps, CreateSectionModalState> {
  static propTypes = {
    courseId: PropTypes.number.isRequired,
    closeModal: PropTypes.func.isRequired,
    reloadSections: PropTypes.func.isRequired
  };

  constructor(props: CreateSectionModalProps) {
    super(props);
    this.state = { userEmails: [], mentorEmail: "", spacetimes: [this.makeSpacetime()], description: "", capacity: "" };
    this.handleChange = this.handleChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.appendSpacetime = this.appendSpacetime.bind(this);
  }

  makeSpacetime(): Spacetime {
    return { dayOfWeek: "", startTime: "", location: "" } as Spacetime;
  }

  componentDidMount(): void {
    fetchJSON("/users/").then((userEmails: string[]) => this.setState({ userEmails }));
  }

  appendSpacetime(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault(); // Annoyingly the submit event for the form gets fired, so we have to suppress it
    this.setState({ spacetimes: [...this.state.spacetimes, this.makeSpacetime()] });
  }

  handleChange({ target: { name, value } }: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>): void {
    if (name.startsWith("location") || name.startsWith("startTime") || name.startsWith("dayOfWeek")) {
      const { spacetimes } = this.state;
      // Funny JavaScript scoping workaround (let [name, index] = name.split("|") doesn't work)
      let index;
      [name, index] = name.split("|");
      index = Number(index);
      this.setState({
        spacetimes: [
          ...spacetimes.slice(0, index),
          { ...spacetimes[index], [name]: value },
          ...spacetimes.slice(index + 1)
        ]
      });
    } else {
      this.setState({ [name]: value } as any);
    }
  }

  handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // eslint-disable-next-line no-unused-vars
    const { userEmails: _, ...data } = this.state;
    const { courseId, reloadSections, closeModal } = this.props;
    data.courseId = courseId;
    //TODO: Handle API Failure
    fetchWithMethod("/sections", HTTP_METHODS.POST, data).then(() => {
      closeModal();
      reloadSections();
    });
  }

  render() {
    const { closeModal } = this.props;
    const { mentorEmail, userEmails, capacity, description, spacetimes } = this.state;
    return (
      <Modal closeModal={closeModal}>
        <form id="create-section-form" className="csm-form" onSubmit={this.handleSubmit}>
          <div id="create-section-form-contents">
            <div id="non-spacetime-fields">
              <label>
                Mentor Email
                <input
                  onChange={this.handleChange}
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
                  {userEmails.map(email => (
                    <option key={email} value={email} />
                  ))}
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
                  onChange={this.handleChange}
                />
              </label>
              <label>
                Description
                <input name="description" type="text" value={description} onChange={this.handleChange} />
              </label>
            </div>
            {spacetimes.map(({ dayOfWeek, startTime, location }, index) => (
              <React.Fragment key={index}>
                <h4 className="spacetime-fields-header">Weekly occurence {index + 1}</h4>
                <div className="spacetime-fields">
                  <label>
                    Location
                    <input
                      onChange={this.handleChange}
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
                    <select onChange={this.handleChange} name={`dayOfWeek|${index}`} value={dayOfWeek} required>
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
                      onChange={this.handleChange as React.FormEventHandler<HTMLInputElement>}
                      required
                      name={`startTime|${index}`}
                      value={startTime}
                    />
                  </label>
                  {index === spacetimes.length - 1 && (
                    <button className="csm-btn" id="add-occurence-btn" onClick={this.appendSpacetime}>
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
  }
}
