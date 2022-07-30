import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../../utils/api";
import { Mentor, Profile } from "../../../utils/types";

import Modal from "../../Modal";
import { SearchBar } from "../../SearchBar";
import { Calendar } from "../calendar/Calendar";
import { CalendarEventSingleTime } from "../calendar/CalendarTypes";
import { MentorPreference, Slot, SlotPreference } from "../EnrollmentAutomationTypes";
import { formatTime } from "../utils";

import CheckIcon from "../../../../static/frontend/img/check.svg";
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
  refreshStage: () => void;
}

/**
 * Component to:
 * - Add mentors to fill out the preference form
 * - View current submitted preferences from mentors
 */
export function ReleaseStage({ profile, slots, prefByMentor, refreshStage }: ReleaseStageProps): React.ReactElement {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | undefined>(undefined);

  const [preferenceModalOpen, setPreferenceModalOpen] = useState<boolean>(false);

  /**
   * Handler to open the preference modal for a mentor
   */
  const handleSelectMentor = (mentor: Mentor | undefined) => {
    console.log(mentor);
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
        refreshStage={refreshStage}
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
  refreshStage: () => void;
}

function MentorList({
  profile,
  prefByMentor,
  selectedMentor,
  setSelectedMentor,
  refreshStage
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
  const [showAddMentorsModal, setShowAddMentorsModal] = useState(false);

  /**
   * Attribute to sort the table by,
   * specified in the form `{attr: key, dir: SortDirection}`.
   *
   * By default, sorts by name in ascending order.
   */
  const [sortBy, setSortBy] = useState<SortByType>({ attr: "name", dir: SortDirection.ASCENDING });

  /**
   * Reference to the search bar input field
   */
  const searchBar = useRef<HTMLInputElement>(null);
  /**
   * Reference to the add mentor text area field
   */
  const addMentorTextArea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchMentors();
  }, []);

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

  const closeForm = () => {
    // send POST request to close form for mentors
    fetchWithMethod(`matcher/${profile.courseId}/configure`, HTTP_METHODS.POST, { open: false }).then(() => {
      // recompute stage
      refreshStage();
    });
  };

  /**
   * Fetches the mentor list from the server, sorted to put mentors
   * that have not filled in the preference form first
   *
   * @returns {Promise<void>}
   */
  const fetchMentors = (): Promise<void> => {
    /**
     * Data format:
     * { "mentors": [{mentor model}, ...] }
     */
    return fetchJSON(`matcher/${profile.courseId}/mentors`).then(data => {
      setMentorList(data.mentors);
      sortTable();
    });
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

    // submit mentor list to add to course
    fetchWithMethod(`matcher/${profile.courseId}/mentors`, HTTP_METHODS.POST, {
      mentors: newMentors
    }).then(response => {
      response
        .json()
        .then(data => {
          if (data.skipped) {
            console.log(data);
          }
        })
        .then(() => {
          if (addMentorTextArea.current) {
            // reset text area
            addMentorTextArea.current.value = "";
          }
          // refetch mentors
          fetchMentors();
        });
    });
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
    fetchWithMethod(`matcher/${profile.courseId}/mentors`, HTTP_METHODS.DELETE, {
      mentors: removedMentorList
    }).then(() => {
      setRemovedMentorList([]);
      // refresh mentor list
      fetchMentors();
    });
  };

  const hasPreferences = (mentor: Mentor) => prefByMentor.has(mentor.id);

  return (
    <React.Fragment>
      {showAddMentorsModal && (
        <Modal closeModal={() => setShowAddMentorsModal(false)}>
          <div className="mentor-list-right">
            <span className="mentor-add-label">Add mentor emails (one per line, or separated by commas):</span>
            <textarea className="mentor-add-textarea" ref={addMentorTextArea}></textarea>
            <button className="matcher-submit-btn" onClick={submitMentorList}>
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
            <button className="matcher-submit-btn" onClick={() => setShowAddMentorsModal(true)}>
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
            {filteredMentorList.map((mentor, index) => (
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
          {removedMentorList.length > 0 && (
            <button className="matcher-secondary-btn" onClick={submitMentorRemovals}>
              Update
            </button>
          )}
        </div>
        <button className="matcher-submit-btn" onClick={closeForm}>
          Close Form
        </button>
      </div>
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
      <EyeIcon className="icon mentor-list-icon mentor-list-item-view" onClick={() => setSelectedMentor(mentor)} />
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

function PreferenceStatusModal({
  slots,
  prefByMentor,
  selectedMentor,
  closeModal
}: PreferenceStatusModalProps): React.ReactElement | null {
  const getEventDetails = (event: CalendarEventSingleTime) => {
    let detail: React.ReactNode = "";
    if (selectedMentor !== undefined) {
      const preferences = prefByMentor.get(selectedMentor.id);
      if (preferences !== undefined) {
        const pref = preferences.find(pref => pref.slot === event.id);
        const maxPref = preferences.reduce((curmax, cur) => Math.max(curmax, cur.preference), 0);
        if (pref !== undefined) {
          let prefColor = "";
          if (pref.preference == 0) {
            prefColor = "matcher-pref-color-unavailable";
          } else if (pref.preference == maxPref) {
            prefColor = "matcher-pref-color-best";
          }

          detail = (
            <React.Fragment>
              <br />
              <span className={prefColor}>({pref.preference})</span>
            </React.Fragment>
          );
        }
      }
    }

    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">
          {formatTime(event.time.startTime)}&#8211;{formatTime(event.time.endTime)}
        </span>
        {detail}
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
          eventCreationEnabled={false}
          limitScrolling={true}
        />
      </div>
    </Modal>
  );
}
