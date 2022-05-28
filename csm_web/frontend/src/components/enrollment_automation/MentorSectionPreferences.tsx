import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Profile } from "../../utils/types";
import { Calendar } from "./calendar/Calendar";
import { CalendarEvent, CalendarEventSingleTime } from "./calendar/CalendarTypes";
import { Slot } from "./EnrollmentAutomationTypes";
import { formatTime, parseTime } from "./utils";

interface MentorSectionPreferencesProps {
  profile: Profile;
}

export function MentorSectionPreferences({ profile }: MentorSectionPreferencesProps): JSX.Element {
  const relation = profile.role.toLowerCase();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedEventIdx, setSelectedEventIdx] = useState<number>(-1);
  const [matcherOpen, setMatcherOpen] = useState<boolean>(false);

  useEffect(() => {
    getSlots();
    getMatcherOpen();
  }, [profile]);

  const getSlots = () => {
    fetchJSON(`matcher/${profile.courseId}/slots`)
      .then(data => {
        const newSlots: Slot[] = [];
        for (const slot of data.slots) {
          const times = [];
          for (const time of slot.times) {
            times.push({
              day: time.day,
              startTime: parseTime(time.startTime),
              endTime: parseTime(time.endTime)
            });
          }
          const parsed_slot: Slot = {
            id: slot.id,
            // replace single quotes for JSON
            times: times,
            preference: 0
          };
          newSlots.push(parsed_slot);
        }
        return newSlots;
      })
      .then(newSlots => {
        // also fetch existing mentor preferences
        fetchJSON(`matcher/${profile.courseId}/preferences`).then(data => {
          for (const pref of data.responses) {
            const slotIndex = newSlots.findIndex(slot => slot.id === pref.slot);
            if (slotIndex !== -1) {
              newSlots[slotIndex].preference = pref.preference;
            }
          }

          setSlots(newSlots);
        });
      });
  };

  const getMatcherOpen = () => {
    fetchJSON(`matcher/${profile.courseId}/configure`).then(data => {
      setMatcherOpen(data.open);
    });
  };

  const setPreference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPreference = parseInt(e.target.value);
    if (isNaN(newPreference)) {
      return;
    }

    const newSlots = slots.map(slot => {
      if (selectedEvent && slot.id === selectedEvent.id) {
        return {
          ...slot,
          preference: parseInt(e.target.value)
        };
      }
      return slot;
    });
    setSlots(newSlots);
    setSelectedEvent(selectedEvent);
  };

  const postPreferences = () => {
    const cleaned_preferences: { id: number; preference: number }[] = [];
    for (const slot of slots) {
      const cleaned_slot = {
        id: slot.id!,
        preference: slot.preference
      };
      cleaned_preferences.push(cleaned_slot);
    }
    fetchWithMethod(`matcher/${profile.courseId}/preferences`, HTTP_METHODS.POST, cleaned_preferences);
  };

  const setSelectedEventIdxWrapper = (idx: number) => {
    if (matcherOpen) {
      setSelectedEventIdx(idx);
      setSelectedEvent(slots[idx]);
    } else {
      setSelectedEventIdx(-1);
      setSelectedEvent(null);
    }
  };

  // const showSidebar = (event_idx: number) => {
  //   setSelectedEvent(slots[event_idx]);
  // };

  const getEventDetails = (event: CalendarEventSingleTime): React.ReactElement => {
    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">
          {formatTime(event.time.startTime)}&#8211;{formatTime(event.time.endTime)}
        </span>
        <br />
        <span className="matcher-detail">Preference: {event.preference}</span>
      </React.Fragment>
    );
  };

  return (
    <div>
      <h2>
        {profile.course} ({relation})
      </h2>
      <div className="matcher-body">
        <div className="mentor-sidebar-left">
          <div className="matcher-sidebar-left-top">
            {matcherOpen ? (
              selectedEvent ? (
                // matcher open, event selected; show details
                <div>
                  Section Time{selectedEvent.times.length > 1 ? "s" : ""}:
                  <div className="matcher-selected-times">
                    {selectedEvent.times.map((time, time_idx) => (
                      <div key={time_idx}>
                        {time.day} {formatTime(time.startTime)}&#8211;{formatTime(time.endTime)}
                      </div>
                    ))}
                  </div>
                  <label>
                    Preference:
                    <input
                      className="matcher-input"
                      type="number"
                      key={selectedEvent.id}
                      defaultValue={selectedEvent.preference}
                      onChange={setPreference}
                      autoFocus={true}
                    />
                  </label>
                </div>
              ) : (
                // matcher open, no selected event
                <div>Click on a section to edit preferences.</div>
              )
            ) : (
              // matcher closed
              <div>The matcher is not currently open for preference submission.</div>
            )}
          </div>
          <div className="matcher-sidebar-left-bottom">
            <button className="matcher-submit-btn" onClick={postPreferences} disabled={!matcherOpen}>
              Submit
            </button>
          </div>
        </div>
        <div className="mentor-sidebar-right">
          <Calendar
            events={slots}
            selectedEventIdx={selectedEventIdx}
            setSelectedEventIdx={setSelectedEventIdxWrapper}
            getEventDetails={getEventDetails}
            eventCreationEnabled={false}
          ></Calendar>
        </div>
      </div>
    </div>
  );
}
