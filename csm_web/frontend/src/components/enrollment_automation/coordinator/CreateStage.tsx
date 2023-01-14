import _ from "lodash";
import React, { useEffect, useState } from "react";

import { Profile } from "../../../utils/types";
import { Tooltip } from "../../Tooltip";
import { Calendar } from "../calendar/Calendar";
import { CalendarEvent, CalendarEventSingleTime, DAYS, DAYS_ABBREV } from "../calendar/CalendarTypes";
import { Slot, Time } from "../EnrollmentAutomationTypes";
import { formatInterval, formatTime, parseTime, serializeTime } from "../utils";

import InfoIcon from "../../../../static/frontend/img/info.svg";
import XIcon from "../../../../static/frontend/img/x.svg";
import { useMatcherSlotsMutation } from "../../../utils/queries/matcher";

const DEFAULT_LOCATION = "TBD";

interface TileDetails {
  days: string[];
  daysLinked: boolean;
  startTime: number;
  endTime: number;
  length: number;
  location: string;
}

interface CreateStageProps {
  profile: Profile;
  initialSlots: Slot[];
  nextStage: () => void;
}

export function CreateStage({ profile, initialSlots, nextStage }: CreateStageProps): JSX.Element {
  /**
   * List of slots to be displayed in the calendar.
   */
  const [slots, _setSlots] = useState<Slot[]>(initialSlots);
  /**
   * Current created times in the new slot.
   */
  const [curCreatedTimes, setCurCreatedTimes] = useState<Time[]>([]);
  /**
   * Saved existing event in case of canceling the edit.
   */
  const [savedExistingEvent, setSavedExistingEvent] = useState<CalendarEvent | null>(null);

  /**
   * Currently selected existing event to view details for.
   */
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  /**
   * Index of currently selected existing event.
   */
  const [selectedEventIndices, setSelectedEventIndices] = useState<number[]>([]);

  /**
   * Whether the user is creating tiled events; shows a specialized sidebar.
   */
  const [creatingTiledEvents, setCreatingTiledEvents] = useState<boolean>(false);
  /**
   * Details for currently created tiled event.
   */
  const [tileDetails, setTileDetails] = useState<TileDetails>({
    days: [],
    daysLinked: true,
    startTime: -1,
    endTime: -1,
    length: 60,
    location: DEFAULT_LOCATION
  });

  /**
   * Whether or not anything has been edited
   */
  const [edited, setEdited] = useState<boolean>(false);

  const matcherSlotsMutation = useMatcherSlotsMutation(profile.courseId);

  /**
   * Whenever initial slots changes, refresh slots
   */
  useEffect(() => {
    _setSlots(initialSlots);
  }, [initialSlots]);

  /**
   *  ref objects for tiled event details
   */
  const tileRefs = {
    days: React.createRef<HTMLFormElement>(),
    startTime: React.createRef<HTMLInputElement>(),
    endTime: React.createRef<HTMLInputElement>(),
    length: React.createRef<HTMLInputElement>(),
    toggle: React.createRef<HTMLInputElement>(),
    location: React.createRef<HTMLInputElement>()
  };

  /**
   * Wrapper for setSlots, marking that changes have been made
   */
  const setSlots = (arg: React.SetStateAction<Slot[]>) => {
    setEdited(true);
    _setSlots(arg);
  };

  useEffect(() => {
    // update calendar with tiled events
    if (
      tileDetails.startTime !== -1 &&
      tileDetails.endTime !== -1 &&
      tileDetails.length !== -1 &&
      tileDetails.startTime < tileDetails.endTime
    ) {
      const newTimes: Time[] = [];
      for (let t = tileDetails.startTime; t <= tileDetails.endTime - tileDetails.length; t += tileDetails.length) {
        for (const day of tileDetails.days) {
          newTimes.push({
            day: day,
            startTime: t,
            endTime: t + tileDetails.length,
            // linked only if there are multiple days and user wants to link them
            isLinked: tileDetails.daysLinked && tileDetails.days.length > 1,
            location: tileDetails.location
          });
        }
      }
      setCurCreatedTimes(newTimes);
    }
  }, [tileDetails]);

  /**
   * Send POST request to create new slots
   */
  const postSlots = (): void => {
    const converted_slots = slots.map(slot => {
      const times = slot.times.map(time => ({
        day: time.day,
        startTime: serializeTime(time.startTime),
        endTime: serializeTime(time.endTime),
        location: time.location
      }));
      return {
        ...slot,
        times: times
      };
    });

    matcherSlotsMutation.mutate(
      { slots: converted_slots },
      {
        onSuccess: () => {
          setEdited(false);
        }
      }
    );
  };

  /**
   * Initialize event creation
   */
  const onEventBeginCreation = (): void => {
    if (curCreatedTimes.length > 0) {
      // has existing times, and now we're adding to it; modify to change tiled field
      setCurCreatedTimes(times => times.map(time => ({ ...time, isLinked: true })));
    }
    setSelectedEvents([]);
    setSelectedEventIndices([]);
  };

  /**
   * Update current event with a new related time
   *
   * @param time new time to add
   */
  const updateTimes = (time: Time): void => {
    if (creatingTiledEvents) {
      // update refs
      if (tileRefs.days.current) {
        const inputs: NodeListOf<HTMLInputElement> = tileRefs.days.current.querySelectorAll("input[type='checkbox']");
        for (const inp of inputs) {
          if (inp.value === time.day) {
            inp.checked = true;
          } else {
            inp.checked = false;
          }
        }
      }
      if (tileRefs.startTime.current) {
        tileRefs.startTime.current.value = serializeTime(time.startTime);
      }
      if (tileRefs.endTime.current) {
        tileRefs.endTime.current.value = serializeTime(time.endTime);
      }
      if (tileRefs.length.current) {
        tileRefs.length.current.value = tileDetails.length.toString();
      }
      setTileDetails({ ...tileDetails, days: [time.day], startTime: time.startTime, endTime: time.endTime });
    } else {
      const newTimes = [...curCreatedTimes, time];
      setCurCreatedTimes(newTimes);
    }
  };

  /**
   * Delete a time from current event
   *
   * @param index       index of time to remove
   * @param useSelected whether to use selected event or the event currently being created
   */
  const deleteTime = (index: number) => {
    const newTimes = [...curCreatedTimes];
    newTimes.splice(index, 1);
    if (newTimes.length > 1) {
      // deleted a time, and still multiple
      setCurCreatedTimes(newTimes);
    } else {
      // down to one time; update linked
      setCurCreatedTimes(newTimes.map(time => ({ ...time, isLinked: false })));
    }
  };

  /**
   * Edit the day field of an event
   *
   * @param index       index of time to edit
   * @param newDay      new day value for time
   * @param useSelected whether to use selected event or the event currently being created
   */
  const editTime_day = (index: number, newDay: string): void => {
    if (!DAYS.includes(newDay)) {
      return;
    }
    const newTimes = [...curCreatedTimes];
    newTimes[index]["day"] = newDay;
    setCurCreatedTimes(newTimes);
  };

  /**
   * Edit the start time field of an event
   *
   * @param index         index of time to edit
   * @param newStartTime  new start time value
   * @param useSelected   whether to use selected event or the event currently being created
   */
  const editTime_startTime = (index: number, newStartTime: string) => {
    const newTimes = [...curCreatedTimes];
    newTimes[index]["startTime"] = parseTime(newStartTime);
    setCurCreatedTimes(newTimes);
  };

  /**
   * Edit the end time field of an event
   *
   * @param index       index of time to edit
   * @param newEndTime  new end time value
   * @param useSelected whether to use selected event or the event currently being created
   */
  const editTime_endTime = (index: number, newEndTime: string) => {
    const newTimes = [...curCreatedTimes];
    newTimes[index]["endTime"] = parseTime(newEndTime);
    setCurCreatedTimes(newTimes);
  };

  /**
   * Edit the location field of an event
   *
   * @param index index of time to edit
   * @param newLocation new location value
   */
  const editTime_location = (index: number, newLocation: string) => {
    const newTimes = [...curCreatedTimes];
    if (newLocation.trim() === "") {
      newTimes[index]["location"] = DEFAULT_LOCATION;
    } else {
      newTimes[index]["location"] = newLocation;
    }
    setCurCreatedTimes(newTimes);
  };

  const toggleCreatingTiledEvents = (e: React.ChangeEvent<HTMLInputElement>): void => {
    // current value of checkbox after click
    const checked = e.target.checked;
    if (checked) {
      // equivalent to canceling event creation
      cancelEvent();
      // initialize tiling event creation
      setTileDetails({
        ...tileDetails,
        days: [],
        daysLinked: true,
        startTime: -1,
        endTime: -1
      });
    } else {
      setCurCreatedTimes([]);
    }
    setCreatingTiledEvents(checked);
  };

  const editTiled_number = (field: string, value: number): void => {
    if (isNaN(value)) {
      return;
    }
    const newDetails = { ...tileDetails, [field]: value };
    setTileDetails(newDetails);
  };

  const editTiled_day = (e: React.ChangeEvent<HTMLFormElement>): void => {
    if (!tileRefs.days.current) {
      return;
    }
    const selected: NodeListOf<HTMLInputElement> = tileRefs.days.current.querySelectorAll(
      "input[type='checkbox']:checked"
    );
    const days = Array.from(selected).map(el => el.value);
    setTileDetails({ ...tileDetails, days: days });
  };

  const editTiled_linked = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setTileDetails({ ...tileDetails, daysLinked: e.target.checked });
  };

  const editTiled_location = (value: string): void => {
    setTileDetails({ ...tileDetails, location: value });
  };

  const saveTiledEvents = () => {
    const newSlots = [];
    for (let t = tileDetails.startTime; t <= tileDetails.endTime - tileDetails.length; t += tileDetails.length) {
      if (tileDetails.daysLinked) {
        const newEvent: CalendarEvent = { times: [] };
        for (const day of tileDetails.days) {
          newEvent.times.push({
            day: day,
            startTime: t,
            endTime: t + tileDetails.length,
            isLinked: tileDetails.days.length > 1,
            location: tileDetails.location
          });
        }
        newSlots.push(newEvent);
      } else {
        for (const day of tileDetails.days) {
          newSlots.push({
            times: [
              {
                day: day,
                startTime: t,
                endTime: t + tileDetails.length,
                isLinked: false,
                location: tileDetails.location
              }
            ]
          });
        }
      }
    }
    setSlots([...slots, ...newSlots] as Slot[]);
    // stop creating tiled events
    tileRefs.toggle.current!.checked = false;
    toggleCreatingTiledEvents({ target: tileRefs.toggle.current! } as React.ChangeEvent<HTMLInputElement>);
  };

  /**
   * Save the newly created event and times
   */
  const saveEvent = () => {
    const newEvent: Slot = { times: curCreatedTimes };
    setSlots([...slots, newEvent]);
    setCurCreatedTimes([]);
    setSavedExistingEvent(null);
    setSelectedEvents([]);
    setSelectedEventIndices([]);
  };

  /**
   * Cancel create event
   */
  const cancelEvent = () => {
    if (savedExistingEvent !== null) {
      setSlots([...slots, savedExistingEvent] as Slot[]);
      setSavedExistingEvent(null);
    }
    // proceed with resetting current event
    deleteEvent();
  };

  /**
   * Delete the event
   */
  const deleteEvent = () => {
    setCurCreatedTimes([]);
    setSelectedEvents([]);
    setSelectedEventIndices([]);
  };

  /**
   * Convert selected event into a newly created event for editing
   */
  const editSelectedEvent = () => {
    if (selectedEvents.length === 1) {
      const event = selectedEvents[0];
      // copy event
      setCurCreatedTimes(_.cloneDeep(event.times));
      setSavedExistingEvent(_.cloneDeep(event)); // duplicate event
      // delete event
      deleteSelectedEvent();
    }
  };

  /**
   * Delete the selected event
   */
  const deleteSelectedEvent = () => {
    const newSlots = slots.filter((_, i) => !selectedEventIndices.includes(i));
    setSlots(newSlots);
    // deselect event
    setSelectedEvents([]);
    setSelectedEventIndices([]);
  };

  /**
   * Wrapper for handler when a time is clicked
   *
   * @param indices index of event to select
   */
  const setSelectedEventIndicesWrapper = (indices: number[]) => {
    if (!creatingTiledEvents && curCreatedTimes.length == 0) {
      setSelectedEventIndices(indices);
      setSelectedEvents(indices.map(idx => slots[idx]));
    }
  };

  /**
   * Render the details of an event in the sidebar
   *
   * @param event event with single time to render details for
   * @returns JSX for sidebar details
   */
  const getEventDetails = (event: CalendarEventSingleTime) => {
    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">{formatInterval(event.time.startTime, event.time.endTime)}</span>
        {/* <br />
        <span className="matcher-detail">Num. Mentors: {event.num_mentors}</span> */}
      </React.Fragment>
    );
  };

  let topContents = <div>Click and drag to create a new section slot, or click an existing slot to edit.</div>;
  if (creatingTiledEvents) {
    topContents = (
      <div className="matcher-sidebar-tiling">
        <div className="matcher-sidebar-tiling-top">
          <div className="matcher-sidebar-header">Create tiled events</div>
          <div className="matcher-sidebar-tiling-body">
            <div className="matcher-tiling-day-container">
              <div className="matcher-tiling-subheader">Days:</div>
              <form className="matcher-tiling-day-form" ref={tileRefs.days} onChange={editTiled_day}>
                {DAYS.map(day => (
                  <label key={day}>
                    <input type="checkbox" value={day} />
                    {day}
                  </label>
                ))}
              </form>
              <div className="matcher-tiling-link-day-container">
                <label className="matcher-tiling-link-day-label">
                  <input type="checkbox" defaultChecked onChange={editTiled_linked} />
                  Link days?
                </label>
                <div className="matcher-tooltip-container">
                  <Tooltip placement="right" source={<InfoIcon className="icon matcher-tooltip-info-icon" />}>
                    <div className="matcher-tiling-tooltip-body">
                      Associate the same times across selected days with a single event.
                    </div>
                  </Tooltip>
                </div>
              </div>
            </div>

            <div className="matcher-tiling-range-container">
              <div className="matcher-tiling-subheader">Range:</div>
              <input
                type="time"
                ref={tileRefs.startTime}
                defaultValue={serializeTime(tileDetails.startTime)}
                step="900"
                onChange={e => editTiled_number("startTime", parseTime(e.target.value))}
              />
              &#8211;
              <input
                type="time"
                ref={tileRefs.endTime}
                defaultValue={serializeTime(tileDetails.endTime)}
                step="900"
                onChange={e => editTiled_number("endTime", parseTime(e.target.value))}
              />
            </div>
            <div className="matcher-tiling-length-container">
              <div className="matcher-tiling-subheader">Length:</div>
              <input
                className="matcher-tiling-length-input"
                type="number"
                ref={tileRefs.length}
                min={15}
                step={5}
                defaultValue={tileDetails.length}
                onChange={e => e.target.validity.valid && editTiled_number("length", parseInt(e.target.value))}
              />
              mins
            </div>
            <div className="matcher-tiling-location-container">
              <div className="matcher-tiling-subheader">Location:</div>
              <input
                className="matcher-tiling-locatoin-input"
                type="text"
                ref={tileRefs.location}
                defaultValue={tileDetails.location}
                onChange={e => editTiled_location(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="matcher-sidebar-tiling-bottom">
          <button className="matcher-secondary-btn" onClick={saveTiledEvents}>
            Save
          </button>
        </div>
      </div>
    );
  } else if (curCreatedTimes.length > 0) {
    // currently editing an event
    topContents = (
      <div className="matcher-sidebar-create">
        <div className="matcher-sidebar-create-top">
          <div className="matcher-sidebar-header">Section Time{curCreatedTimes.length > 1 ? "s" : ""}:</div>
          <div className="matcher-created-times">
            {curCreatedTimes.map((time, time_idx) => (
              <div className="matcher-created-time-container" key={time_idx}>
                <div className="matcher-created-time-remove">
                  <XIcon className="icon matcher-remove-time-icon" onClick={() => deleteTime(time_idx)} />
                </div>
                <div className="matcher-created-time">
                  <div className="matcher-created-time-detail">
                    <select
                      defaultValue={time.day}
                      key={`day_${time_idx}/${selectedEventIndices}`}
                      onChange={e => editTime_day(time_idx, e.target.value)}
                    >
                      {DAYS.map(day => (
                        <option key={day} value={day}>
                          {DAYS_ABBREV[day]}
                        </option>
                      ))}
                    </select>
                    <input
                      type="time"
                      key={`start_${time_idx}/${selectedEventIndices}`}
                      defaultValue={serializeTime(time.startTime)}
                      step="900"
                      onChange={e => editTime_startTime(time_idx, e.target.value)}
                    />
                    &#8211;
                    <input
                      type="time"
                      key={`end_${time_idx}/${selectedEventIndices}`}
                      defaultValue={serializeTime(time.endTime)}
                      step="900"
                      onChange={e => editTime_endTime(time_idx, e.target.value)}
                    />
                  </div>
                  <div className="matcher-created-time-location">
                    <span>Location:</span>
                    <input
                      type="text"
                      key={`location_${time_idx}/${selectedEventIndices}`}
                      defaultValue={time.location}
                      onChange={e => editTime_location(time_idx, e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="matcher-sidebar-create-bottom">
          <div className="matcher-sidebar-create-bottom-row">
            <button className="matcher-secondary-btn" onClick={saveEvent}>
              Save
            </button>
            <button className="matcher-secondary-btn" onClick={cancelEvent}>
              Cancel
            </button>
          </div>
          <div className="matcher-sidebar-create-bottom-row">
            <button className="matcher-danger-btn" onClick={deleteEvent}>
              Delete
            </button>
          </div>
        </div>
        <div className="matcher-sidebar-create-footer">Drag to add another time to the slot.</div>
      </div>
    );
  } else if (selectedEvents.length > 0) {
    // selected an event to view, but not edit
    topContents = (
      <div className="matcher-sidebar-selected">
        <div className="matcher-sidebar-selected-top">
          {selectedEvents.length === 1 ? (
            // exactly one selected event
            <React.Fragment>
              <div className="matcher-sidebar-header">Section Time{selectedEvents[0].times.length > 1 ? "s" : ""}:</div>
              <ul className="matcher-selected-times">
                {selectedEvents[0].times.map((time, time_idx) => (
                  <li key={time_idx} className="matcher-selected-time-container">
                    <span className="matcher-selected-time">
                      {time.day} {formatTime(time.startTime)}&#8211;{formatTime(time.endTime)}
                    </span>
                    <br />
                    <span className="matcher-selected-location">(location: {time.location})</span>
                  </li>
                ))}
              </ul>
            </React.Fragment>
          ) : (
            // multiple selected events
            <div className="matcher-sidebar-header">Multiple selected events</div>
          )}
        </div>
        <div className="matcher-sidebar-selected-bottom">
          {selectedEvents.length === 1 && (
            <div className="matcher-sidebar-selected-bottom-row">
              <button className="matcher-secondary-btn" onClick={editSelectedEvent}>
                Edit
              </button>
            </div>
          )}
          <div className="matcher-sidebar-selected-bottom-row">
            <button className="matcher-danger-btn" onClick={deleteSelectedEvent}>
              Delete
            </button>
          </div>
        </div>{" "}
        <div className="matcher-sidebar-create-footer">Shift-click to select more slots.</div>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="matcher-body">
        <div className="coordinator-sidebar-left">
          <div className="matcher-sidebar-left-top">{topContents}</div>
          <div className="matcher-sidebar-left-bottom">
            <label className="matcher-submit-btn matcher-tiling-toggle matcher-toggle-btn">
              <input type="checkbox" onChange={toggleCreatingTiledEvents} ref={tileRefs.toggle} />
              Create tiled events
            </label>
            <button className="matcher-submit-btn" onClick={postSlots}>
              Submit
            </button>
          </div>
        </div>
        <div className="coordinator-sidebar-right">
          <Calendar
            events={slots}
            selectedEventIndices={selectedEventIndices}
            setSelectedEventIndices={setSelectedEventIndicesWrapper}
            createdTimes={curCreatedTimes}
            getEventDetails={getEventDetails}
            eventCreationEnabled={true}
            onEventBeginCreation={onEventBeginCreation}
            onEventCreated={updateTimes}
            brighterLinkedTimes={true}
          />
        </div>
      </div>
      <div className="matcher-body-footer-right">
        <div className="matcher-unsaved-changes-container">
          {edited && <span className="matcher-unsaved-changes">You have unsaved changes!</span>}
        </div>
        <button className="matcher-submit-btn" onClick={nextStage} disabled={edited}>
          Continue
        </button>
      </div>
    </React.Fragment>
  );
}
