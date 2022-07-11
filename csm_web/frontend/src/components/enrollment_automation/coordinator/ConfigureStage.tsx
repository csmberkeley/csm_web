import React, { useEffect, useState } from "react";
import { fetchJSON, fetchWithMethod } from "../../../utils/api";

import { Profile } from "../../../utils/types";
import { Calendar } from "../calendar/Calendar";
import { CalendarEventSingleTime } from "../calendar/CalendarTypes";
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

  const [selectingAll, setSelectingAll] = useState<boolean>(false);

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

  const setSelectedEventIdxWrapper = (idx: number) => {
    if (!selectingAll) {
      setSelectedEventIdx(idx);
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
    const checked = e.target.checked;
    if (checked) {
      setSelectingAll(true);
      setSelectedEventIdx(-1);
    } else {
      setSelectingAll(false);
      setSelectedEventIdx(-1);
    }
  };

  const updateMinMentor = (slotId: number, minMentors_str: string) => {
    const minMentors = parseInt(minMentors_str);
    if (!isNaN(minMentors)) {
      let newMinMentorMap: Map<number, number>;
      if (selectingAll) {
        newMinMentorMap = new Map();
        for (const slotId of minMentorMap.keys()) {
          newMinMentorMap.set(slotId, minMentors);
        }
      } else {
        newMinMentorMap = new Map(minMentorMap);
        newMinMentorMap.set(slotId, minMentors);
      }
      setMinMentorMap(newMinMentorMap);
    }
  };

  const updateMaxMentor = (slotId: number, maxMentors_str: string) => {
    const maxMentors = parseInt(maxMentors_str);
    if (!isNaN(maxMentors)) {
      let newMaxMentorMap: Map<number, number>;
      if (selectingAll) {
        newMaxMentorMap = new Map();
        for (const slotId of minMentorMap.keys()) {
          newMaxMentorMap.set(slotId, maxMentors);
        }
      } else {
        newMaxMentorMap = new Map(maxMentorMap);
        newMaxMentorMap.set(slotId, maxMentors);
      }
      setMaxMentorMap(newMaxMentorMap);
    }
  };

  const runMatcher = () => {
    fetchWithMethod(`/matcher/${profile.courseId}/configure`, "POST", { run: true }).then(() => {
      refreshStage();
    });
  };

  let sidebarContents = <div>Click on a time slot to configure it.</div>;

  // has selected an event
  if (selectedEventIdx != -1 || selectingAll) {
    let slot: Slot;
    if (selectingAll) {
      slot = slots[0];
    } else {
      slot = slots[selectedEventIdx];
    }
    const minMentor = minMentorMap.get(slot.id!);
    const maxMentor = maxMentorMap.get(slot.id!);
    console.log({ slot, id: slot.id, minMentor, maxMentor });

    sidebarContents = (
      <div className="matcher-configure-sidebar-contents">
        <div className="matcher-configure-sidebar-header">Number of mentors:</div>
        <div className="matcher-configure-input-container">
          <div key={`${slot.id}-min`} className="matcher-configure-input-group">
            <span>Min</span>
            <input
              className="matcher-configure-input"
              type="number"
              min={0}
              max={maxMentor}
              defaultValue={minMentor}
              onChange={e => {
                updateMinMentor(slot.id!, e.target.value);
              }}
            />
          </div>
          <div key={`${slot.id}-max`} className="matcher-configure-input-group">
            <span>Max</span>
            <input
              className="matcher-configure-input"
              type="number"
              min={minMentor}
              defaultValue={maxMentor}
              onChange={e => {
                updateMaxMentor(slot.id!, e.target.value);
              }}
            />
          </div>
        </div>
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
              <input type="checkbox" onChange={toggleSelectAll} />
              Select All
            </label>
          </div>
        </div>
        <div className="coordinator-sidebar-right">
          <Calendar
            events={slots}
            selectedEventIdx={selectedEventIdx}
            setSelectedEventIdx={setSelectedEventIdxWrapper}
            getEventDetails={getEventDetails}
            eventCreationEnabled={false}
          />
        </div>
      </div>
      <div className="matcher-body-footer-right">
        <button className="matcher-submit-btn" onClick={runMatcher}>
          Run Matcher
        </button>
      </div>
    </React.Fragment>
  );
};
