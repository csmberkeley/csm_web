import React, { useEffect, useMemo, useRef, useState } from "react";

import { formatInterval } from "../../../utils/datetime";
import {
  useMatcherAddMentorsMutation,
  useMatcherConfigMutation,
  useMatcherMentors,
  useMatcherRemoveMentorsMutation
} from "../../../utils/queries/matcher";
import { Mentor, Profile } from "../../../utils/types";
import LoadingSpinner from "../../LoadingSpinner";
import Modal from "../../Modal";
import { SearchBar } from "../../SearchBar";
import { Tooltip } from "../../Tooltip";
import { Slot, SlotPreference } from "../EnrollmentAutomationTypes";
import { Calendar } from "../calendar/Calendar";
import { CalendarEventSingleTime } from "../calendar/CalendarTypes";

import CheckIcon from "../../../../static/frontend/img/check.svg";
import CheckCircleIcon from "../../../../static/frontend/img/check_circle.svg";
import EyeIcon from "../../../../static/frontend/img/eye.svg";
import SortDownIcon from "../../../../static/frontend/img/sort-down.svg";
import SortUnknownIcon from "../../../../static/frontend/img/sort-unknown.svg";
import SortUpIcon from "../../../../static/frontend/img/sort-up.svg";
import UndoIcon from "../../../../static/frontend/img/undo.svg";
import XIcon from "../../../../static/frontend/img/x.svg";

interface ReleaseStageProps {
  profile: Profile;
  slots: Slot[];
  /**
   * Map from mentor id to their slot preferences
   */
  prefByMentor: Map<number, SlotPreference[]>;
  formIsOpen: boolean;
  prevStage: () => void;
}

/**
 * Component to:
 * - Add mentors to fill out the preference form
 * - View current submitted preferences from mentors
 */
export function ReleaseStage({
  profile,
  slots,
  prefByMentor,
  formIsOpen,
  prevStage
}: ReleaseStageProps): React.ReactElement {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | undefined>(undefined);

  const [preferenceModalOpen, setPreferenceModalOpen] = useState<boolean>(false);

  /**
   * Handler to open the preference modal for a mentor
   */
  const handleSelectMentor = (mentor: Mentor | undefined) => {
    setSelectedMentor(mentor);
    if (mentor === undefined) {
      setPreferenceModalOpen(false);
    } else {
      setPreferenceModalOpen(true);
    }
  };

  return (
    <React.Fragment>
      {preferenceModalOpen && (
        <PreferenceStatusModal
          profile={profile}
          slots={slots}
          prefByMentor={prefByMentor}
          selectedMentor={selectedMentor}
          closeModal={() => handleSelectMentor(undefined)}
        />
      )}
      <MentorList
        profile={profile}
        prefByMentor={prefByMentor}
        selectedMentor={selectedMentor}
        setSelectedMentor={handleSelectMentor}
        prevStage={prevStage}
        formIsOpen={formIsOpen}
      />
    </React.Fragment>
  );
}

enum SortDirection {
  ASCENDING = 1,
  DESCENDING = -1,
  UNKNOWN = 0
}

type SortAttr = "name" | "email" | "submitted";

interface SortByType {
  attr: SortAttr;
  dir: SortDirection;
}

interface MentorListProps {
  profile: Profile;
  prefByMentor: Map<number, SlotPreference[]>;
  selectedMentor: Mentor | undefined;
  setSelectedMentor: (mentor: Mentor | undefined) => void;
  prevStage: () => void;
  formIsOpen: boolean;
}

enum Status {
  NONE,
  LOADING,
  SUCCESS
}

function MentorList({
  profile,
  prefByMentor,
  selectedMentor,
  setSelectedMentor,
  prevStage,
  formIsOpen
}: MentorListProps): React.ReactElement {
  /**
   * List of all mentors associated with the course that have no assigned section
   */
  const [mentorList, setMentorList] = useState<Mentor[]>([]);
  /**
   * Mentors matching search query
   */
  const [filteredMentorList, setFilteredMentorList] = useState<Mentor[]>(mentorList);
  /**
   * Mentors to be removed
   */
  const [removedMentorList, setRemovedMentorList] = useState<string[]>([]);
  /**
   * Whether to show the add mentors modal
   */
  const [showAddMentorsModal, setShowAddMentorsModal] = useState<boolean>(false);
  /**
   * Whether to show the open form confirmation modal
   */
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

  /**
   * Attribute to sort the table by,
   * specified in the form `{attr: key, dir: SortDirection}`.
   *
   * By default, sorts by name in ascending order.
   */
  const [sortBy, setSortBy] = useState<SortByType>({ attr: "name", dir: SortDirection.ASCENDING });

  /**
   * List of all mentors associated with the course that have no assigned section
   */
  const {
    data: jsonMentorList,
    isSuccess: jsonMentorListLoaded,
    refetch: refetchMentorList
  } = useMatcherMentors(profile.courseId);

  const matcherConfigMutation = useMatcherConfigMutation(profile.courseId);
  const matcherMentorsMutation = useMatcherAddMentorsMutation(profile.courseId);
  const matcherRemoveMentorsMutation = useMatcherRemoveMentorsMutation(profile.courseId);

  /**
   * Status upon requesting to open/close the form
   */
  const [formStatus, setFormStatus] = useState<Status>(Status.NONE);

  /**
   * Reference to the search bar input field
   */
  const searchBar = useRef<HTMLInputElement>(null);
  /**
   * Reference to the add mentor text area field
   */
  const addMentorTextArea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (jsonMentorListLoaded) {
      setMentorList(jsonMentorList.mentors);
    }
    sortTable();
  }, [jsonMentorList]);

  useEffect(() => {
    updateSearch(searchBar.current?.value);
  }, [mentorList]);

  const numSubmitted = useMemo(() => {
    let count = 0;
    for (const mentor of mentorList) {
      if (prefByMentor.has(mentor.id)) {
        count += 1;
      }
    }
    return count;
  }, [mentorList]);

  const openForm = (): void => {
    setFormStatus(Status.LOADING);
    // send POST request to release form for mentors
    matcherConfigMutation.mutate(
      { open: true },
      {
        onSuccess: () => {
          setFormStatus(Status.SUCCESS);
          setInterval(() => {
            setFormStatus(Status.NONE);
          }, 1500);
        }
      }
    );
  };

  const closeForm = () => {
    setFormStatus(Status.LOADING);
    // send POST request to close form for mentors
    matcherConfigMutation.mutate(
      { open: false },
      {
        onSuccess: () => {
          setFormStatus(Status.SUCCESS);
          setInterval(() => {
            setFormStatus(Status.NONE);
          }, 1500);
        }
      }
    );
  };

  const submitMentorList = () => {
    const newMentorsString = addMentorTextArea.current?.value;
    setShowAddMentorsModal(false);

    if (!newMentorsString) {
      // nothing to request
      return;
    }

    let newMentors: string[] = [];
    if (newMentorsString.includes(",")) {
      // split by commas
      newMentors = newMentorsString.split(",").map(email => email.trim());
    } else {
      // split by newline
      newMentors = newMentorsString.split("\n").map(email => email.trim());
    }
    // filter empty emails
    newMentors = newMentors.filter(email => email.length > 0);

    if (newMentors.length == 0) {
      // nothing to request
      return;
    }

    // submit mentor list to add to course
    matcherMentorsMutation.mutate(
      { mentors: newMentors },
      {
        onSuccess: response => {
          if (response.skipped) {
            console.log(response.skipped);
          }

          if (addMentorTextArea.current) {
            // reset text area
            addMentorTextArea.current.value = "";
          }
          // refetch mentors
          refetchMentorList();
        }
      }
    );
  };

  /**
   * Retrieves the sort direction of the specified attribute.
   * If the attribute is not sorted, returns SortDirection.UNKNOWN.
   *
   * @param attr attribute to sort by
   * @returns direction of sort for the attribute
   */
  const getSortDirection = (attr: SortAttr): SortDirection => {
    if (sortBy.attr === attr) {
      return sortBy.dir;
    } else {
      return SortDirection.UNKNOWN;
    }
  };

  /**
   * Click handler to update the sort direction for the given attribute.
   */
  const updateSort = (attr: SortAttr) => {
    if (sortBy.attr === attr) {
      if (sortBy.dir === SortDirection.ASCENDING) {
        setSortBy({ attr, dir: SortDirection.DESCENDING });
      } else {
        setSortBy({ attr, dir: SortDirection.ASCENDING });
      }
    } else {
      setSortBy({ attr, dir: SortDirection.ASCENDING });
    }
  };

  const sortTable = () => {
    setMentorList((oldMentorList: Mentor[]) =>
      Array.from(oldMentorList).sort((a, b) => {
        let aVal, bVal;
        if (sortBy.attr === "submitted") {
          aVal = hasPreferences(a);
          bVal = hasPreferences(b);
        } else {
          // case insensitive comparison
          aVal = a[sortBy.attr].toLowerCase();
          bVal = b[sortBy.attr].toLowerCase();
        }

        if (aVal > bVal) {
          return sortBy.dir as number;
        } else if (aVal < bVal) {
          return -sortBy.dir as number;
        } else {
          return 0;
        }
      })
    );
  };

  /* Sort table on upate */
  useEffect(sortTable, [sortBy]);

  /**
   * Update the search query and the resulting filtered mentor list.
   */
  const updateSearch = (term?: string) => {
    if (term === undefined) {
      setFilteredMentorList(mentorList);
      return;
    }
    const lowercaseTerm = term.toLowerCase();
    const newFilteredMentorList = mentorList.filter(mentor => {
      let include = false;
      include ||= mentor.name.toLowerCase().includes(lowercaseTerm);
      if (term.includes("@")) {
        include ||= mentor.email.toLowerCase().includes(lowercaseTerm);
      } else {
        include ||= mentor.email.split("@")[0].toLowerCase().includes(lowercaseTerm);
      }
      return include;
    });
    setFilteredMentorList(newFilteredMentorList);
  };

  const removeMentor = (mentor: Mentor) => {
    setRemovedMentorList(prev => [...prev, mentor.email]);
  };

  const undoRemoveMentor = (mentor: Mentor) => {
    setRemovedMentorList(prev => prev.filter(email => email !== mentor.email));
  };

  const submitMentorRemovals = () => {
    if (removedMentorList.length == 0) {
      // no need to submit any requests
      return;
    }
    // submit mentors to remove from course
    matcherRemoveMentorsMutation.mutate(
      { mentors: removedMentorList },
      {
        onSuccess: () => {
          setRemovedMentorList([]);
          // refresh mentor list
          refetchMentorList();
        }
      }
    );
  };

  const hasPreferences = (mentor: Mentor) => prefByMentor.has(mentor.id);

  let formStatusIcon = null;
  if (formStatus === Status.LOADING) {
    formStatusIcon = <LoadingSpinner className="matcher-body-footer-status-icon" />;
  } else if (formStatus === Status.SUCCESS) {
    formStatusIcon = <CheckCircleIcon className="matcher-body-footer-status-icon" />;
  }

  let confirmOpenFormModal = null;
  if (showConfirmModal) {
    confirmOpenFormModal = (
      <Modal closeModal={() => setShowConfirmModal(false)}>
        <h2 className="matcher-confirm-modal-header">Open Form</h2>
        <p>Are you sure you want to open the form for mentors?</p>
        <p>
          <b>Once mentors submit preferences, you will not be able to edit slots.</b>
        </p>
        <div className="matcher-confirm-modal-buttons">
          <button className="secondary-btn" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </button>
          <button
            className="primary-btn"
            onClick={() => {
              setShowConfirmModal(false);
              openForm();
            }}
          >
            Open form
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <React.Fragment>
      {showAddMentorsModal && (
        <Modal closeModal={() => setShowAddMentorsModal(false)}>
          <div className="mentor-list-right">
            <span className="mentor-add-label">Add mentor emails (one per line, or separated by commas):</span>
            <textarea className="mentor-add-textarea form-input" ref={addMentorTextArea}></textarea>
            <button className="primary-btn" onClick={submitMentorList}>
              Submit
            </button>
          </div>
        </Modal>
      )}
      <div className="mentor-list-container">
        <div className="mentor-list-top">
          <div className="mentor-list-top-search">
            <SearchBar refObject={searchBar} onChange={e => updateSearch(e.target.value)} />
            <span className="mentor-list-num-submitted">
              ({numSubmitted} / {mentorList.length} submitted)
            </span>
          </div>
          <div className="mentor-list-top-buttons">
            <button className="primary-btn" onClick={() => setShowAddMentorsModal(true)}>
              Add Mentors
            </button>
          </div>
        </div>
        <div className="mentor-list-body">
          <div className="mentor-list-header">
            <div className="mentor-list-icon mentor-list-item-remove"></div>
            <div className="mentor-list-icon mentor-list-item-view"></div>
            <div className="mentor-list-item-name">
              <div className="matcher-table-sort-group" onClick={() => updateSort("name")}>
                <span>Name</span>
                <SortButton sortDirection={getSortDirection("name")} />
              </div>
            </div>
            <div className="mentor-list-item-email">
              <div className="matcher-table-sort-group" onClick={() => updateSort("email")}>
                <span>Email</span>
                <SortButton sortDirection={getSortDirection("email")} />
              </div>
            </div>
            <div className="mentor-list-item-check">
              <div className="matcher-table-sort-group" onClick={() => updateSort("submitted")}>
                <span>Submitted</span>
                <SortButton sortDirection={getSortDirection("submitted")} />
              </div>
            </div>
          </div>
          <div className="mentor-list">
            {filteredMentorList.map(mentor => (
              <MentorListItem
                key={mentor.id}
                mentor={mentor}
                removedMentorList={removedMentorList}
                removeMentor={removeMentor}
                undoRemoveMentor={undoRemoveMentor}
                hasPreferences={hasPreferences(mentor)}
                selectedMentor={selectedMentor}
                setSelectedMentor={setSelectedMentor}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="matcher-body-footer-sticky matcher-body-footer">
        <div>
          {mentorList.every(mentor => !hasPreferences(mentor)) && (
            <button className="secondary-btn" onClick={prevStage}>
              Back
            </button>
          )}
          {removedMentorList.length > 0 && (
            <button className="secondary-btn" onClick={submitMentorRemovals}>
              Update
            </button>
          )}
        </div>
        <div className="matcher-body-footer-status-container">
          {formStatusIcon}
          {formIsOpen ? (
            <button className="primary-btn" onClick={closeForm}>
              Close Form
            </button>
          ) : (
            <button className="primary-btn" onClick={() => setShowConfirmModal(true)}>
              Open Form
            </button>
          )}
        </div>
      </div>
      {showConfirmModal && confirmOpenFormModal}
    </React.Fragment>
  );
}

interface SortButtonProps {
  sortDirection: SortDirection;
}

const SortButton = ({ sortDirection }: SortButtonProps) => {
  let icon = <SortUnknownIcon className="icon matcher-table-sort-icon" />;
  if (sortDirection == SortDirection.ASCENDING) {
    icon = <SortUpIcon className="icon matcher-table-sort-icon" />;
  } else if (sortDirection == SortDirection.DESCENDING) {
    icon = <SortDownIcon className="icon matcher-table-sort-icon" />;
  }
  return icon;
};

interface MentorListItemProps {
  mentor: Mentor;
  removedMentorList: string[];
  removeMentor: (mentor: Mentor) => void;
  undoRemoveMentor: (mentor: Mentor) => void;
  hasPreferences: boolean;
  selectedMentor: Mentor | undefined;
  setSelectedMentor: (mentor: Mentor | undefined) => void;
}

function MentorListItem({
  mentor,
  removedMentorList,
  removeMentor,
  undoRemoveMentor,
  hasPreferences,
  selectedMentor,
  setSelectedMentor
}: MentorListItemProps) {
  const classList = ["mentor-list-item"];
  // whether we can select the item
  if (hasPreferences) {
    classList.push("mentor-list-item-clickable");
  } else {
    classList.push("mentor-list-item-unclickable");
  }
  // removal status
  let removeIcon;
  if (removedMentorList.includes(mentor.email)) {
    classList.push("mentor-list-item-removed");
    removeIcon = (
      <UndoIcon
        className="icon mentor-list-icon mentor-list-item-undo-remove"
        onClick={() => undoRemoveMentor(mentor)}
      />
    );
  } else {
    removeIcon = (
      <XIcon className="icon mentor-list-icon mentor-list-item-remove" onClick={() => removeMentor(mentor)} />
    );
  }
  // selection status
  if (selectedMentor?.id === mentor.id) {
    classList.push("mentor-list-item-selected");
  }
  const classString = classList.join(" ");

  return (
    <div className={classString}>
      {removeIcon}
      <EyeIcon
        className="icon outline mentor-list-icon mentor-list-item-view"
        onClick={() => hasPreferences && setSelectedMentor(mentor)}
      />
      <div className="mentor-list-item-name">{mentor.name}</div>
      <div className="mentor-list-item-email">{mentor.email}</div>
      <div className="mentor-list-item-check">{hasPreferences && <CheckIcon className="icon mentor-list-icon" />}</div>
    </div>
  );
}

interface PreferenceStatusModalProps {
  profile: Profile;
  slots: Slot[];
  /**
   * Map from mentor id to mentor preferences
   */
  prefByMentor: Map<number, SlotPreference[]>;
  selectedMentor: Mentor | undefined;
  closeModal: () => void;
}

const MIN_COLOR = "136, 136, 136, 0.8";
const MAX_COLOR = "124, 233, 162";

function PreferenceStatusModal({
  slots,
  prefByMentor,
  selectedMentor,
  closeModal
}: PreferenceStatusModalProps): React.ReactElement | null {
  const getEventDetails = (event: CalendarEventSingleTime) => {
    let prefColor = `rgba(${MIN_COLOR})`;
    let preference = null;
    if (selectedMentor !== undefined) {
      const preferences = prefByMentor.get(selectedMentor.id);
      if (preferences !== undefined) {
        const pref = preferences.find(pref => pref.slot === event.id);
        const maxPref = preferences.reduce((curmax, cur) => Math.max(curmax, cur.preference), 0);
        if (pref !== undefined) {
          preference = pref.preference;
          if (pref.preference === 0) {
            prefColor = `rgba(${MIN_COLOR})`;
          } else {
            const opacity = pref.preference / maxPref;
            prefColor = `rgba(${MAX_COLOR}, ${opacity})`;
          }
        }
      }
    }

    return (
      <React.Fragment>
        <Tooltip
          placement="top"
          source={
            <div className="matcher-pref-distribution-div" style={{ backgroundColor: prefColor }}>
              <span className="calendar-event-detail-time">{formatInterval(event.time.interval)}</span>
            </div>
          }
        >
          Preference: {preference ?? "N/A"}
        </Tooltip>
      </React.Fragment>
    );
  };

  // don't display anything if no mentor is selected
  if (selectedMentor === undefined) {
    return null;
  }

  return (
    <Modal closeModal={closeModal} className="matcher-calendar-modal">
      <div className="matcher-calendar-modal-contents">
        <div className="matcher-calendar-modal-header">
          Preferences for {selectedMentor.name}{" "}
          <span className="matcher-pref-modal-email">({selectedMentor.email})</span>
        </div>
        <Calendar
          events={slots}
          selectedEventIndices={[]}
          setSelectedEventIndices={() => {
            /* do nothing */
          }}
          getEventDetails={getEventDetails}
          flushDetails={true}
          eventCreationEnabled={false}
          limitScrolling={true}
          brighterLinkedTimes={false}
        />
      </div>
    </Modal>
  );
}
