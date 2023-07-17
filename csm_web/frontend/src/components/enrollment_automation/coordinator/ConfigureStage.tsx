import React, { useEffect, useRef, useState } from "react";

import { useMatcherConfig, useMatcherConfigMutation } from "../../../utils/queries/matcher";
import { Profile } from "../../../utils/types";
import LoadingSpinner from "../../LoadingSpinner";
import { Calendar } from "../calendar/Calendar";
import { CalendarEventSingleTime } from "../calendar/CalendarTypes";
import { Slot } from "../EnrollmentAutomationTypes";
import { formatInterval } from "../../../utils/datetime";

import CheckCircle from "../../../../static/frontend/img/check_circle.svg";
import ErrorCircle from "../../../../static/frontend/img/error_outline.svg";

enum Status {
  NONE,
  LOADING,
  SUCCESS,
  ERROR
}

interface ConfigureStageProps {
  profile: Profile;
  slots: Slot[];
  /**
   * Force the matcher to recompute the current stage,
   * even if data did not change.
   */
  recomputeStage: () => void;
}

export const ConfigureStage = ({ profile, slots, recomputeStage }: ConfigureStageProps) => {
  const [selectedEventIndices, setSelectedEventIndices] = useState<number[]>([]);
  // slot id -> min mentors
  const [minMentorMap, setMinMentorMap] = useState<Map<number, number>>(new Map());
  // slot id -> max mentors
  const [maxMentorMap, setMaxMentorMap] = useState<Map<number, number>>(new Map());
  const [submitStatus, setSubmitStatus] = useState<Status>();
  const [matcherError, setMatcherError] = useState<string>("");
  const [configError, setConfigError] = useState<string>("");

  const { data: matcherConfig, isSuccess: matcherConfigLoaded } = useMatcherConfig(profile.courseId);
  const matcherConfigMutation = useMatcherConfigMutation(profile.courseId);
  const runMatcherMutation = useMatcherConfigMutation(profile.courseId, true);

  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!matcherConfigLoaded) {
      return;
    }

    const minMentorMap = new Map();
    const maxMentorMap = new Map();
    matcherConfig.slots.forEach((slot: any) => {
      minMentorMap.set(slot.id, slot.minMentors);
      maxMentorMap.set(slot.id, slot.maxMentors);
    });
    setMinMentorMap(minMentorMap);
    setMaxMentorMap(maxMentorMap);
  }, [matcherConfig]);

  const setSelectedEventIdxWrapper = (indices: number[]) => {
    setSelectedEventIndices(indices);
    setConfigError("");
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
        <span className="calendar-event-detail-time">{formatInterval(event.time.interval)}</span>
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
    runMatcherMutation.mutate(
      { run: true },
      {
        onSuccess: () => {
          setMatcherError("");
          recomputeStage();
        },
        onError: response => {
          setMatcherError(response.error ?? "An error has occurred when running the matcher.");
        }
      }
    );
  };

  const reopenForm = () => {
    // send POST request to reopen form for mentors
    matcherConfigMutation.mutate({ open: true });
  };

  const saveConfig = () => {
    const formatted = slots.map(slot => ({
      id: slot.id,
      minMentors: minMentorMap.get(slot.id!),
      maxMentors: maxMentorMap.get(slot.id!)
    }));
    setSubmitStatus(Status.LOADING);
    matcherConfigMutation.mutate(
      { slots: formatted },
      {
        onSuccess: () => {
          setConfigError("");
          setSubmitStatus(Status.SUCCESS);
          // clear after 1.5 seconds
          setTimeout(() => {
            setSubmitStatus(Status.NONE);
          }, 1500);
        },
        onError: response => {
          setConfigError(response.error ?? "An error has occurred when saving configurations.");
          setSubmitStatus(Status.ERROR);
        }
      }
    );
  };

  let statusContent: React.ReactNode = "";
  switch (submitStatus) {
    case Status.LOADING:
      statusContent = <LoadingSpinner className="icon matcher-submit-status-icon" />;
      break;
    case Status.SUCCESS:
      statusContent = <CheckCircle className="icon matcher-submit-status-icon" />;
  }

  let sidebarContents = (
    <div className="matcher-configure-sidebar-contents">
      <div className="matcher-configure-input-container">Click on a time slot to configure it.</div>
      <div className="matcher-configure-sidebar-buttons">
        <button className="matcher-submit-btn" onClick={saveConfig}>
          Save
        </button>
        <div className="matcher-submit-status-container">{statusContent}</div>
      </div>
    </div>
  );

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
        {configError && (
          <div className="matcher-configure-error">
            <ErrorCircle className="icon matcher-configure-error-icon" />
            <span className="matcher-configure-error-text">{configError}</span>
          </div>
        )}
        <div className="matcher-configure-sidebar-footer">Shift-click to select more slots.</div>
        <div className="matcher-configure-sidebar-buttons">
          <button className="matcher-submit-btn" onClick={saveConfig}>
            Save
          </button>
          <div className="matcher-submit-status-container">{statusContent}</div>
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
            brighterLinkedTimes={false}
          />
        </div>
      </div>
      <div className="matcher-body-footer">
        <button className="matcher-secondary-btn" onClick={reopenForm}>
          Reopen Form
        </button>
        {matcherError && (
          <div className="matcher-configure-error">
            <ErrorCircle className="icon matcher-configure-error-icon" />
            <span className="matcher-configure-error-text">{matcherError}</span>
          </div>
        )}
        <button className="matcher-submit-btn" onClick={runMatcher}>
          Run Matcher
        </button>
      </div>
    </React.Fragment>
  );
};
