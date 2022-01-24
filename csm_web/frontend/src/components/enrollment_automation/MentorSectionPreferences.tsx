import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Profile } from "../../utils/types";
import { Calendar, CalendarEvent, CalendarEventSingleTime } from "./calendar/Calendar";
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

  useEffect(() => {
    getSlots();
  }, [profile]);

  const getSlots = () => {
    fetchJSON(`matcher/${profile.courseId}/slots`)
      .then(data => {
        const newSlots: Slot[] = [];
        for (const slot of data) {
          const parsed_times = JSON.parse(slot.times.replace(/'/g, '"'));
          const times = [];
          for (const time of parsed_times) {
            times.push({
              day: time.day,
              start_time: parseTime(time.start_time),
              end_time: parseTime(time.end_time)
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
          for (const pref of data) {
            const slotIndex = newSlots.findIndex(slot => slot.id === pref.slot);
            if (slotIndex !== -1) {
              newSlots[slotIndex].preference = pref.preference;
            }
          }

          setSlots(newSlots);
        });
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
      if (slot.preference !== 0) {
        const cleaned_slot = {
          id: slot.id!,
          preference: slot.preference
        };
        cleaned_preferences.push(cleaned_slot);
      }
    }
    fetchWithMethod(`matcher/${profile.courseId}/preferences`, HTTP_METHODS.POST, cleaned_preferences);
  };

  const setSelectedEventIdxWrapper = (idx: number) => {
    setSelectedEventIdx(idx);
    setSelectedEvent(slots[idx]);
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
            {selectedEvent ? (
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
              <div>Click on a section to edit preferences.</div>
            )}
          </div>
          <div className="matcher-sidebar-left-bottom">
            <button className="matcher-submit-btn" onClick={postPreferences}>
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
