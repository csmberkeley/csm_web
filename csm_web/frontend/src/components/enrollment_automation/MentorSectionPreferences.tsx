import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../utils/api";
import { Profile } from "../../utils/types";
import { Calendar, CalendarEvent, CalendarEventSingleTime } from "./calendar/Calendar";
import { Preference } from "./EnrollmentAutomationTypes";

interface MentorSectionPreferencesProps {
  profile: Profile;
}

/**
 * Convert 24hr time to 12hr time
 *
 * @param time string in format "HH:MM"
 */
function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hours = parseInt(h, 10);
  const minutes = parseInt(m, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  if (minutes == 0) {
    return `${hours > 12 ? hours % 12 : hours} ${ampm}`;
  }
  return `${hours > 12 ? hours % 12 : hours}:${minutes} ${ampm}`;
}

export function MentorSectionPreferences({ profile }: MentorSectionPreferencesProps): JSX.Element {
  const relation = profile.role.toLowerCase();

  const [slots, setSlots] = useState<Preference[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    getSlots();
  }, [profile]);

  const getSlots = () => {
    fetchJSON(`matcher/${profile.courseId}/slots`).then(data => {
      const slots = [];
      for (const slot of data) {
        const parsed_slot: Preference = {
          id: slot.id,
          // replace single quotes for JSON
          times: JSON.parse(slot.times.replace(/'/g, '"')),
          preference: 0
        };
        slots.push(parsed_slot);
      }
      setSlots(slots);
    });
    // TODO: update slots with existing preferences
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

  const showSidebar = (event_idx: number) => {
    setSelectedEvent(slots[event_idx]);
  };

  const getEventDetails = (event: CalendarEventSingleTime): React.ReactElement => {
    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">
          {formatTime(event.time.start_time)}&#8211;{formatTime(event.time.end_time)}
        </span>
        <br />
        <span className="mentor-pref-detail">Preference: {event.preference}</span>
      </React.Fragment>
    );
  };

  return (
    <div>
      <h2>
        {profile.course} ({relation})
      </h2>
      <div className="mentor-pref-body">
        <div className="mentor-pref-sidebar-left">
          <div className="mentor-pref-sidebar-left-top">
            {selectedEvent ? (
              <div>
                Section Time{selectedEvent.times.length > 1 ? "s" : ""}:
                <div className="mentor-pref-selected-times">
                  {selectedEvent.times.map((time, time_idx) => (
                    <div key={time_idx}>
                      {time.day} {formatTime(time.start_time)}&#8211;{formatTime(time.end_time)}
                    </div>
                  ))}
                </div>
                <label>
                  Preference:
                  <input
                    className="mentor-pref-input"
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
          <div className="mentor-pref-sidebar-left-bottom">
            <button className="mentor-pref-submit-btn" onClick={postPreferences}>
              Submit
            </button>
          </div>
        </div>
        <div className="mentor-pref-sidebar-right">
          <Calendar events={slots} onEventClick={showSidebar} getEventDetails={getEventDetails}></Calendar>
        </div>
      </div>
    </div>
  );
}
