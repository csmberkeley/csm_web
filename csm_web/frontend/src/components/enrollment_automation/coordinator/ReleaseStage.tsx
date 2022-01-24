import React, { useEffect, useRef, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../../utils/api";
import { Mentor, Profile } from "../../../utils/types";

import XIcon from "../../../../static/frontend/img/x.svg";
import { Slot, MentorPreference, SlotPreference } from "../EnrollmentAutomationTypes";
import { Calendar, CalendarEventSingleTime } from "../calendar/Calendar";
import { formatTime } from "../utils";

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
}

enum Tabs {
  MENTOR_LIST,
  PREFERENCE_STATUS
}

/**
 * Component to:
 * - Add mentors to fill out the preference form
 * - View current submitted preferences from mentors
 */
export function ReleaseStage({ profile, slots, prefBySlot, prefByMentor }: ReleaseStageProps): React.ReactElement {
  const [curTab, setCurTab] = useState(Tabs.MENTOR_LIST);

  let innerComponent = null;
  if (curTab === Tabs.MENTOR_LIST) {
    innerComponent = <MentorList profile={profile} prefByMentor={prefByMentor} />;
  } else if (curTab === Tabs.PREFERENCE_STATUS) {
    innerComponent = <PreferenceStatus profile={profile} slots={slots} prefByMentor={prefByMentor} />;
  }

  return (
    <div className="release-container">
      <div className="release-tablist">
        <a
          className={`release-tab ${curTab === Tabs.MENTOR_LIST ? "active" : ""}`}
          onClick={() => curTab === Tabs.PREFERENCE_STATUS && setCurTab(Tabs.MENTOR_LIST)}
        >
          Mentors
        </a>
        <a
          className={`release-tab ${curTab === Tabs.PREFERENCE_STATUS ? "active" : ""}`}
          onClick={() => curTab === Tabs.MENTOR_LIST && setCurTab(Tabs.PREFERENCE_STATUS)}
        >
          Preferences
        </a>
      </div>
      <div className="release-body">{innerComponent}</div>
    </div>
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
}

function MentorList({ profile, prefByMentor }: MentorListProps): React.ReactElement {
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

  const searchBar = useRef<HTMLInputElement>(null);
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
    setMentorList(prev => prev.filter(prev_mentor => prev_mentor.email !== mentor.email));
    setRemovedMentorList(prev => [...prev, mentor.email]);
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

  return (
    <React.Fragment>
      <div className="mentor-list-container">
        <div className="mentor-list-left">
          <div className="mentor-list-left-top">
            <div className="mentor-list-search">
              <span className="mentor-list-search-label">Search Mentors:</span>
              <input
                className="mentor-list-search-input"
                type="text"
                ref={searchBar}
                onChange={e => updateSearch(e.target.value)}
              />
            </div>
            <div className="mentor-list">
              {filteredMentorList.map((mentor, index) => (
                <div className="mentor-list-item" key={index}>
                  <XIcon className="icon mentor-list-item-remove" onClick={() => removeMentor(mentor)} />
                  {mentorString(mentor)}
                </div>
              ))}
            </div>
          </div>
          <div className="mentor-list-left-bottom">
            <button
              className="matcher-submit-btn"
              onClick={submitMentorRemovals}
              disabled={removedMentorList.length == 0}
            >
              Update
            </button>
          </div>
        </div>
        <div className="mentor-list-right">
          <span className="mentor-add-label">Add mentors (one per line, or separated by commas):</span>
          <textarea className="mentor-add-textarea" ref={addMentorTextArea}></textarea>
          <button className="matcher-submit-btn" onClick={submitMentorList}>
            Submit
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

interface PreferenceStatusProps {
  profile: Profile;
  slots: Slot[];
  /**
   * Map from mentor id to mentor preferences
   */
  prefByMentor: Map<number, SlotPreference[]>;
}

function PreferenceStatus({ profile, slots, prefByMentor }: PreferenceStatusProps): React.ReactElement {
  const [selectedMentor, setSelectedMentor] = useState<Mentor | undefined>(undefined);
  const [mentorList, setMentorList] = useState<Mentor[]>([]);
  const [filteredMentorList, setFilteredMentorList] = useState<Mentor[]>([]);

  const searchBar = useRef<HTMLInputElement>(null);

  // fetch mentors on first load
  useEffect(() => {
    fetchMentors();
  }, []);

  // update filtered mentor list whenever the mentor list updates
  useEffect(() => {
    updateSearch(searchBar.current?.value);
  }, [mentorList]);

  /**
   * Fetch mentors from server, filtering only those with preferences
   */
  const fetchMentors = () => {
    fetchJSON(`matcher/${profile.courseId}/mentors`).then(data => {
      const sortedMentors: Mentor[] = data.mentors.sort((mentor1: Mentor, mentor2: Mentor) =>
        mentor1.email.toLowerCase().localeCompare(mentor2.email.toLowerCase())
      );
      const filteredMentors = sortedMentors.filter((mentor: Mentor) => prefByMentor.has(mentor.id));
      setMentorList(filteredMentors);
    });
  };

  const getEventDetails = (event: CalendarEventSingleTime) => {
    let detail: React.ReactNode = "";
    if (selectedMentor !== undefined) {
      const preferences = prefByMentor.get(selectedMentor.id);
      if (preferences !== undefined) {
        const pref = preferences.find(pref => pref.slot === event.id);
        if (pref !== undefined) {
          detail = (
            <React.Fragment>
              <br />
              <span>Preference: {pref.preference}</span>
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

  const updateSearch = (term?: string) => {
    if (term === undefined) {
      setFilteredMentorList(mentorList);
      return;
    }
    const newFilteredMentorList = mentorList.filter(
      mentor =>
        mentor.email.toLowerCase().includes(term.toLowerCase()) ||
        mentor.name.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredMentorList(newFilteredMentorList);
  };

  return (
    <div className="pref-status-container">
      <div className="pref-status-left">
        <div className="pref-status-search">
          <span className="pref-status-search-label">Search Mentors:</span>
          <input
            className="pref-status-search-input"
            type="text"
            ref={searchBar}
            onChange={e => updateSearch(e.target.value)}
          />
        </div>
        <div className="pref-status-mentor-list">
          {filteredMentorList.map((mentor, index) => (
            <div className="pref-status-mentor-list-item" key={index} onClick={() => setSelectedMentor(mentor)}>
              {mentorString(mentor)}
            </div>
          ))}
        </div>
      </div>
      <div className="pref-status-right">
        <Calendar
          events={slots}
          selectedEventIdx={-1}
          setSelectedEventIdx={() => {
            /* do nothing */
          }}
          getEventDetails={getEventDetails}
          eventCreationEnabled={false}
          disableHover={true}
        />
      </div>
    </div>
  );
}
