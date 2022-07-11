import React, { useEffect, useRef, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../../utils/api";
import { Mentor, Profile } from "../../../utils/types";

import { Slot, MentorPreference, SlotPreference } from "../EnrollmentAutomationTypes";
import { Calendar } from "../calendar/Calendar";
import { CalendarEventSingleTime } from "../calendar/CalendarTypes";
import { formatTime } from "../utils";

import XIcon from "../../../../static/frontend/img/x.svg";
import UndoIcon from "../../../../static/frontend/img/undo.svg";
import EyeIcon from "../../../../static/frontend/img/eye.svg";
import CheckIcon from "../../../../static/frontend/img/check.svg";
import Modal from "../../Modal";
import { SearchBar } from "../../SearchBar";

interface ReleaseStageProps {
  profile: Profile;
  slots: Slot[];
  /**
   * Map from slot id to mentor preferences for that slot
   */
  prefBySlot: Map<number, MentorPreference[]>;
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
export function ReleaseStage({
  profile,
  slots,
  prefBySlot,
  prefByMentor,
  refreshStage
}: ReleaseStageProps): React.ReactElement {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | undefined>(undefined);
  console.log(selectedMentor);

  const closeForm = () => {
    // send POST request to close form for mentors
    fetchWithMethod(`matcher/${profile.courseId}/configure`, HTTP_METHODS.POST, { open: false }).then(() => {
      // recompute stage
      refreshStage();
    });
  };

  return (
    <React.Fragment>
      <div className="release-container">
        <div className="release-body-top">
          <MentorList
            profile={profile}
            prefByMentor={prefByMentor}
            selectedMentor={selectedMentor}
            setSelectedMentor={setSelectedMentor}
          />
        </div>
        <div className="release-body-bottom">
          <PreferenceStatus
            profile={profile}
            slots={slots}
            prefByMentor={prefByMentor}
            selectedMentor={selectedMentor}
          />
        </div>
      </div>

      <div className="matcher-body-footer-right">
        <button className="matcher-submit-btn" onClick={closeForm}>
          Close Form
        </button>
      </div>
    </React.Fragment>
  );
}

const mentorString = (mentor: Mentor) => {
  if (mentor.name) {
    return (
      <span className="mentor-list-item-text">
        {mentor.name} <span className="mentor-list-item-text-small">({mentor.email})</span>
      </span>
    );
  } else {
    return <span className="mentor-list-item-text">{mentor.email}</span>;
  }
};

interface MentorListProps {
  profile: Profile;
  prefByMentor: Map<number, SlotPreference[]>;
  selectedMentor: Mentor | undefined;
  setSelectedMentor: React.Dispatch<React.SetStateAction<Mentor | undefined>>;
}

function MentorList({ profile, prefByMentor, selectedMentor, setSelectedMentor }: MentorListProps): React.ReactElement {
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
      // sort alphabetically, then put all mentors with no preferences first
      const sortedMentors: Mentor[] = data.mentors.sort((mentor1: Mentor, mentor2: Mentor) =>
        mentor1.email.toLowerCase().localeCompare(mentor2.email.toLowerCase())
      );
      const noPrefMentors = [];
      const hasPrefMentors = [];
      for (const mentor of sortedMentors) {
        if (prefByMentor.has(mentor.id)) {
          hasPrefMentors.push(mentor);
        } else {
          noPrefMentors.push(mentor);
        }
      }
      setMentorList([...noPrefMentors, ...hasPrefMentors]);
    });
  };

  const submitMentorList = () => {
    const newMentorsString = addMentorTextArea.current?.value;
    setShowAddMentorsModal(false);

    if (!newMentorsString) {
      // nothing to request
      return;
    }

    console.log(newMentorsString);

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

  const updateSearch = (term?: string) => {
    if (term === undefined) {
      setFilteredMentorList(mentorList);
      return;
    }
    const newFilteredMentorList = mentorList.filter(mentor => {
      return (
        mentor.email.toLowerCase().includes(term.toLowerCase()) ||
        mentor.name.toLowerCase().includes(term.toLowerCase())
      );
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

  console.log(filteredMentorList);

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
          <SearchBar ref={searchBar} onChange={e => updateSearch(e.target.value)} />
          <div className="mentor-list-top-buttons">
            {removedMentorList.length > 0 && (
              <button className="matcher-secondary-btn" onClick={submitMentorRemovals}>
                Update
              </button>
            )}

            <button className="matcher-submit-btn" onClick={() => setShowAddMentorsModal(true)}>
              Add Mentors
            </button>
          </div>
        </div>
        <div className="mentor-list-body">
          <div className="mentor-list-header">
            <div className="mentor-list-icon mentor-list-item-remove"></div>
            <div className="mentor-list-icon mentor-list-item-view"></div>
            <div className="mentor-list-item-name">Name</div>
            <div className="mentor-list-item-email">Email</div>
            <div className="mentor-list-item-check">Submitted</div>
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
        <div className="mentor-list-bottom"></div>
      </div>
    </React.Fragment>
  );
}

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

interface PreferenceStatusProps {
  profile: Profile;
  slots: Slot[];
  /**
   * Map from mentor id to mentor preferences
   */
  prefByMentor: Map<number, SlotPreference[]>;
  selectedMentor: Mentor | undefined;
}

function PreferenceStatus({ slots, prefByMentor, selectedMentor }: PreferenceStatusProps): React.ReactElement {
  console.log("preference status");
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

  return (
    <div className="pref-status-container">
      <Calendar
        events={slots}
        selectedEventIdx={-1}
        setSelectedEventIdx={() => {
          /* do nothing */
        }}
        getEventDetails={getEventDetails}
        eventCreationEnabled={false}
        disableHover={true}
        limitScrolling={true}
      />
    </div>
  );
}
