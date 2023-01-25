import React, { useEffect, useState } from "react";
import { Profile } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import { Calendar } from "./calendar/Calendar";
import { CalendarEvent, CalendarEventSingleTime } from "./calendar/CalendarTypes";
import { Slot } from "./EnrollmentAutomationTypes";
import { formatInterval, formatTime, MAX_PREFERENCE, parseTime } from "./utils";

import CheckCircle from "../../../static/frontend/img/check_circle.svg";
import ErrorCircle from "../../../static/frontend/img/x_circle.svg";
import { useMatcherPreferenceMutation, useMatcherPreferences, useMatcherSlots } from "../../utils/queries/matcher";

enum Status {
  NONE,
  LOADING,
  SUCCESS,
  ERROR
}

interface MentorSectionPreferencesProps {
  profile: Profile;
  switchProfile: () => void;
  switchProfileEnabled: boolean;
}

export function MentorSectionPreferences({
  profile,
  switchProfile,
  switchProfileEnabled
}: MentorSectionPreferencesProps): JSX.Element {
  const relation = profile.role.toLowerCase();

  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [selectedEventIndices, setSelectedEventIndices] = useState<number[]>([]);

  /**
   * Status after submitting preferences
   */
  const [submitStatus, setSubmitStatus] = useState<Status>(Status.NONE);

  const { data: jsonSlots, isSuccess: jsonSlotsLoaded } = useMatcherSlots(profile.courseId);
  const { data: jsonPreferences, isSuccess: jsonPreferencesLoaded } = useMatcherPreferences(profile.courseId);

  const matcherPreferenceMutation = useMatcherPreferenceMutation(profile.courseId);

  useEffect(() => {
    // wait for all data to be loaded
    if (!jsonSlotsLoaded || !jsonPreferencesLoaded) {
      return;
    }

    const newSlots: Slot[] = [];
    for (const slot of jsonSlots.slots) {
      const times = [];
      for (const time of slot.times) {
        times.push({
          day: time.day,
          startTime: parseTime(time.startTime),
          endTime: parseTime(time.endTime),
          isLinked: time.isLinked
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

    for (const pref of jsonPreferences.responses) {
      const slotIndex = newSlots.findIndex(slot => slot.id === pref.slot);
      if (slotIndex !== -1) {
        newSlots[slotIndex].preference = pref.preference;
      }
    }

    setSlots(newSlots);
  }, [jsonSlotsLoaded, jsonPreferencesLoaded]);

  const setPreference = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPreference = parseInt(e.target.value);
    if (isNaN(newPreference)) {
      return;
    }

    const selectedEventIds = selectedEvents.map(event => event.id);
    let intPreference = parseInt(e.target.value);

    // clamp preference value
    intPreference = Math.min(MAX_PREFERENCE, Math.max(0, intPreference));

    const newSlots = slots.map(slot => {
      if (selectedEventIds.includes(slot.id)) {
        return {
          ...slot,
          preference: intPreference
        };
      }
      return slot;
    });
    setSlots(newSlots);
    setSelectedEvents(selectedEvents);
  };

  const postPreferences = () => {
    const cleaned_preferences: { id: number; preference: number }[] = [];
    for (const slot of slots) {
      const cleaned_slot = {
        id: slot.id!,
        preference: Math.min(MAX_PREFERENCE, Math.max(0, slot.preference))
      };
      cleaned_preferences.push(cleaned_slot);
    }
    setSubmitStatus(Status.LOADING);

    matcherPreferenceMutation.mutate(cleaned_preferences, {
      onSuccess: () => {
        setSubmitStatus(Status.SUCCESS);
        // clear after 1.5 seconds
        setTimeout(() => {
          setSubmitStatus(Status.NONE);
        }, 1500);
      },
      onError: () => {
        setSubmitStatus(Status.ERROR);
      }
    });
  };

  const setSelectedEventIndicesWrapper = (indices: number[]) => {
    setSelectedEventIndices(indices);
    setSelectedEvents(indices.map(idx => slots[idx]));
  };

  const getEventDetails = (event: CalendarEventSingleTime): React.ReactElement => {
    const maxPref = slots.reduce((curmax, cur) => Math.max(curmax, cur.preference), 0);
    let prefColor = "";
    if (event.preference == 0) {
      prefColor = "matcher-pref-color-unavailable";
    } else if (event.preference == maxPref) {
      prefColor = "matcher-pref-color-best";
    }

    const detail = (
      <React.Fragment>
        <br />
        <span className={prefColor}>({event.preference})</span>
      </React.Fragment>
    );

    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">{formatInterval(event.time.startTime, event.time.endTime)}</span>
        {detail}
      </React.Fragment>
    );
  };

  let sidebarContents;
  if (selectedEvents.length === 0) {
    // no selected event
    sidebarContents = <div>Click on a section to edit preferences.</div>;
  } else {
    const event = selectedEvents[0];
    sidebarContents = (
      <div className="matcher-sidebar-selected">
        <div className="mathcer-sidebar-selected-top">
          {selectedEvents.length === 1 ? (
            // exactly one selected event
            <React.Fragment>
              <div className="matcher-sidebar-header">Section Time{event.times.length > 1 ? "s" : ""}:</div>
              <ul className="matcher-selected-times">
                {event.times.map((time, time_idx) => (
                  <li key={time_idx} className="matcher-selected-time-container">
                    <span className="matcher-selected-time">
                      {time.day} {formatTime(time.startTime)}&#8211;{formatTime(time.endTime)}
                    </span>
                  </li>
                ))}
              </ul>
            </React.Fragment>
          ) : (
            // multiple selected events
            <div className="matcher-sidebar-header">Multiple selected events</div>
          )}
          <label>
            Preference:
            <input
              className="matcher-input"
              type="number"
              key={event.id}
              defaultValue={event.preference}
              onChange={setPreference}
              autoFocus={true}
              min={0}
              max={MAX_PREFERENCE}
            />
          </label>
        </div>
        <div className="matcher-sidebar-create-footer">
          <div className="matcher-sidebar-pref-help">
            Rate your preferences from 0 to {MAX_PREFERENCE}.
            <br />0 means unavailable, {MAX_PREFERENCE} means most preferred.
            <br />
            <br />
            <b>Please provide nonzero preferences for at least 3 slots.</b>
          </div>
          <div>Shift-click to select more slots.</div>
        </div>
      </div>
    );
  }

  let statusContent: React.ReactNode = "";
  switch (submitStatus) {
    case Status.LOADING:
      statusContent = <LoadingSpinner className="icon matcher-submit-status-icon" />;
      break;
    case Status.SUCCESS:
      statusContent = <CheckCircle className="icon matcher-submit-status-icon" />;
      break;
    case Status.ERROR:
      statusContent = <ErrorCircle className="icon matcher-submit-status-icon error error" />;
      break;
  }

  return (
    <div>
      <div className="matcher-title">
        <h2>
          {profile.course} ({relation})
        </h2>
        {switchProfileEnabled && (
          <button className="matcher-secondary-btn" onClick={switchProfile}>
            Switch profile
          </button>
        )}
      </div>
      <div className="matcher-body">
        <div className="mentor-sidebar-left">
          <div className="matcher-sidebar-left-top">{sidebarContents}</div>
          <div className="matcher-sidebar-left-bottom-row">
            <button className="matcher-submit-btn" onClick={postPreferences}>
              Submit
            </button>
            <div className="matcher-submit-status-container">{statusContent}</div>
          </div>
        </div>
        <div className="mentor-sidebar-right">
          <Calendar
            events={slots}
            selectedEventIndices={selectedEventIndices}
            setSelectedEventIndices={setSelectedEventIndicesWrapper}
            getEventDetails={getEventDetails}
            eventCreationEnabled={false}
            limitScrolling={true}
            brighterLinkedTimes={true}
          ></Calendar>
        </div>
      </div>
    </div>
  );
}
