import React, { useEffect, useRef, useState } from "react";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../../../utils/api";

import { Profile } from "../../../utils/types";
import { Calendar } from "../calendar/Calendar";
import { CalendarEventSingleTime } from "../calendar/CalendarTypes";
import { MentorPreference, Slot, SlotPreference } from "../EnrollmentAutomationTypes";
import { formatTime } from "../utils";

interface ConfigureStageProps {
  profile: Profile;
  slots: Slot[];
  refreshStage: () => void;
}

export const ConfigureStage = ({ profile, slots, refreshStage }: ConfigureStageProps) => {
  const [selectedEventIndices, setSelectedEventIndices] = useState<number[]>([]);
  // slot id -> min mentors
  const [minMentorMap, setMinMentorMap] = useState<Map<number, number>>(new Map());
  // slot id -> max mentors
  const [maxMentorMap, setMaxMentorMap] = useState<Map<number, number>>(new Map());

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const minMentorMap = new Map();
    const maxMentorMap = new Map();
    fetchJSON(`/matcher/${profile.courseId}/configure`).then((data: any) => {
      data.slots.forEach((slot: any) => {
        minMentorMap.set(slot.id, slot.minMentors);
        maxMentorMap.set(slot.id, slot.maxMentors);
      });
      setMinMentorMap(minMentorMap);
      setMaxMentorMap(maxMentorMap);
    });
  }, [slots]);

  const setSelectedEventIdxWrapper = (indices: number[]) => {
    setSelectedEventIndices(indices);
    if (selectAllRef.current) {
      if (indices.length === slots.length) {
        // selected all
        selectAllRef.current.checked = true;
        selectAllRef.current.indeterminate = false;
      } else if (indices.length === 0) {
        // selected none
        selectAllRef.current.checked = false;
        selectAllRef.current.indeterminate = false;
      } else {
        // somewhere in between
        selectAllRef.current.checked = false;
        selectAllRef.current.indeterminate = true;
      }
    }
  };

  const getEventDetails = (event: CalendarEventSingleTime) => {
    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">
          {formatTime(event.time.startTime)}&#8211;{formatTime(event.time.endTime)}
        </span>
        <br />
        <span className="matcher-mentor-min-max">
          ({minMentorMap.get(event.id)}&#8211;{maxMentorMap.get(event.id)})
        </span>
      </React.Fragment>
    );
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newSelectedEventIndices: number[];
    if (selectedEventIndices.length == slots.length) {
      // currently selecting all, so select none
      newSelectedEventIndices = [];
    } else {
      // select all
      newSelectedEventIndices = [...slots.keys()];
    }
    setSelectedEventIndices(newSelectedEventIndices);
  };

  const updateMinMentor = (minMentors_str: string) => {
    const minMentors = parseInt(minMentors_str);
    if (!isNaN(minMentors)) {
      const newMinMentorMap = new Map(minMentorMap);
      for (const idx of selectedEventIndices) {
        const slotId = slots[idx].id!;
        newMinMentorMap.set(slotId, minMentors);
      }
      setMinMentorMap(newMinMentorMap);
    }
  };

  const updateMaxMentor = (maxMentors_str: string) => {
    const maxMentors = parseInt(maxMentors_str);
    if (!isNaN(maxMentors)) {
      const newMaxMentorMap = new Map(maxMentorMap);
      for (const idx of selectedEventIndices) {
        const slotId = slots[idx].id!;
        newMaxMentorMap.set(slotId, maxMentors);
      }
      setMaxMentorMap(newMaxMentorMap);
    }
  };

  const runMatcher = () => {
    fetchWithMethod(`/matcher/${profile.courseId}/configure`, HTTP_METHODS.POST, { run: true }).then(() => {
      refreshStage();
    });
  };

  const reopenForm = () => {
    // send POST request to reopen form for mentors
    fetchWithMethod(`matcher/${profile.courseId}/configure`, HTTP_METHODS.POST, { open: true }).then(() => {
      // recompute stage
      refreshStage();
    });
  };

  let sidebarContents = <div>Click on a time slot to configure it.</div>;

  // has selected an event
  if (selectedEventIndices.length > 0) {
    const slot = slots[selectedEventIndices[0]];

    const minMentor = minMentorMap.get(slot.id!);
    const maxMentor = maxMentorMap.get(slot.id!);

    sidebarContents = (
      <div className="matcher-configure-sidebar-contents">
        <div className="matcher-configure-sidebar-header">Number of mentors:</div>
        <div className="matcher-configure-input-container">
          <div key={`${slot.id}-${selectedEventIndices.length}-min`} className="matcher-configure-input-group">
            <span>Min</span>
            <input
              className="matcher-configure-input"
              type="number"
              min={0}
              max={maxMentor}
              defaultValue={minMentor}
              onChange={e => {
                updateMinMentor(e.target.value);
              }}
            />
          </div>
          <div key={`${slot.id}-${selectedEventIndices.length}-max`} className="matcher-configure-input-group">
            <span>Max</span>
            <input
              className="matcher-configure-input"
              type="number"
              min={minMentor}
              defaultValue={maxMentor}
              onChange={e => {
                updateMaxMentor(e.target.value);
              }}
            />
          </div>
        </div>
        <div className="matcher-configure-sidebar-footer">Shift-click to select more slots.</div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="matcher-body">
        <div className="coordinator-sidebar-left">
          <div className="matcher-sidebar-left-top">{sidebarContents}</div>
          <div className="matcher-sidebar-left-bottom">
            <label className="matcher-submit-btn matcher-toggle-btn">
              <input ref={selectAllRef} type="checkbox" onChange={toggleSelectAll} />
              Select All
            </label>
          </div>
        </div>
        <div className="coordinator-sidebar-right">
          <Calendar
            events={slots}
            selectedEventIndices={selectedEventIndices}
            setSelectedEventIndices={setSelectedEventIdxWrapper}
            getEventDetails={getEventDetails}
            eventCreationEnabled={false}
            limitScrolling={true}
          />
        </div>
      </div>
      <div className="matcher-body-footer">
        <button className="matcher-secondary-btn" onClick={reopenForm}>
          Reopen Form
        </button>
        <button className="matcher-submit-btn" onClick={runMatcher}>
          Run Matcher
        </button>
      </div>
    </React.Fragment>
  );
};
