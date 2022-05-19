import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod } from "../../../utils/api";

import { Profile } from "../../../utils/types";
import { Calendar, CalendarEventSingleTime } from "../calendar/Calendar";
import { MentorPreference, Slot, SlotPreference } from "../EnrollmentAutomationTypes";
import { formatTime } from "../utils";

interface ConfigureStageProps {
  profile: Profile;
  slots: Slot[];
  prefBySlot: Map<number, MentorPreference[]>;
  prefByMentor: Map<number, SlotPreference[]>;
  refreshStage: () => void;
}

export const ConfigureStage = ({ profile, slots, prefBySlot, prefByMentor, refreshStage }: ConfigureStageProps) => {
  const [selectedEventIdx, setSelectedEventIdx] = useState<number>(-1);
  // slot id -> min mentors
  const [minMentorMap, setMinMentorMap] = useState<Map<number, number>>(new Map());
  // slot id -> max mentors
  const [maxMentorMap, setMaxMentorMap] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    const minMentorMap = new Map();
    const maxMentorMap = new Map();
    fetchJSON(`/matcher/${profile.courseId}/configure`).then((data: any) => {
      console.log(data);
      data.slots.forEach((slot: any) => {
        minMentorMap.set(slot.id, slot.minMentors);
        maxMentorMap.set(slot.id, slot.maxMentors);
      });
      setMinMentorMap(minMentorMap);
      setMaxMentorMap(maxMentorMap);
    });
  }, [slots]);

  const getEventDetails = (event: CalendarEventSingleTime) => {
    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">
          {formatTime(event.time.startTime)}&#8211;{formatTime(event.time.endTime)}
        </span>
        <br />
        <span className="">
          Min: {minMentorMap.get(event.id)}; Max: {maxMentorMap.get(event.id)}
        </span>
      </React.Fragment>
    );
  };

  const updateMinMentor = (slotId: number, minMentors_str: string) => {
    const minMentors = parseInt(minMentors_str);
    if (!isNaN(minMentors)) {
      const newMinMentorMap = new Map(minMentorMap);
      newMinMentorMap.set(slotId, minMentors);
      setMinMentorMap(newMinMentorMap);
    }
  };

  const updateMaxMentor = (slotId: number, maxMentors_str: string) => {
    const maxMentors = parseInt(maxMentors_str);
    if (!isNaN(maxMentors)) {
      const newMaxMentorMap = new Map(maxMentorMap);
      newMaxMentorMap.set(slotId, maxMentors);
      setMaxMentorMap(newMaxMentorMap);
    }
  };

  const runMatcher = () => {
    fetchWithMethod(`/matcher/${profile.courseId}/configure`, "POST", { run: true }).then(() => {
      refreshStage();
    });
  };

  let sidebarContents = <div>Click on a time slot to configure it.</div>;

  if (selectedEventIdx != -1) {
    // has selected an event
    const slot = slots[selectedEventIdx];
    const minMentor = minMentorMap.get(slot.id!);
    const maxMentor = maxMentorMap.get(slot.id!);
    console.log({ slot, id: slot.id, minMentor, maxMentor });

    sidebarContents = (
      <div>
        <div key={slot.id}>
          <span>Minimum mentors: </span>
          <input
            type="number"
            defaultValue={minMentor}
            onChange={e => {
              updateMinMentor(slot.id!, e.target.value);
            }}
          />
        </div>
        <div>
          <span>Maximum mentors: </span>
          <input
            type="number"
            defaultValue={maxMentor}
            onChange={e => {
              updateMaxMentor(slot.id!, e.target.value);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="matcher-body">
        <div className="coordinator-sidebar-left">
          <div className="matcher-sidebar-left-top">{sidebarContents}</div>
        </div>
        <div className="coordinator-sidebar-right">
          <Calendar
            events={slots}
            selectedEventIdx={selectedEventIdx}
            setSelectedEventIdx={setSelectedEventIdx}
            getEventDetails={getEventDetails}
            eventCreationEnabled={false}
          />
        </div>
      </div>
      <div className="matcher-body-footer">
        <button className="matcher-submit-btn" onClick={runMatcher}>
          Run Matcher
        </button>
      </div>
    </React.Fragment>
  );
};
