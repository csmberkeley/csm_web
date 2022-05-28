import React, { useEffect, useState } from "react";
import { fetchWithMethod, fetchJSON, HTTP_METHODS } from "../../../utils/api";
import { Profile } from "../../../utils/types";
import { Calendar } from "../calendar/Calendar";
import { CalendarEvent, CalendarEventSingleTime, DAYS, DAYS_ABBREV } from "../calendar/CalendarTypes";
import { Slot, Time } from "../EnrollmentAutomationTypes";
import { formatTime, parseTime, serializeTime } from "../utils";

import XIcon from "../../../../static/frontend/img/x.svg";

interface TileDetails {
  days: string[];
  daysLinked: boolean;
  startTime: number;
  endTime: number;
  length: number;
}

interface CreateStageProps {
  profile: Profile;
  initialSlots: Slot[];
  refreshStage: () => void;
}

export function CreateStage({ profile, initialSlots, refreshStage }: CreateStageProps): JSX.Element {
  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [curCreatedTimes, setCurCreatedTimes] = useState<Time[]>([]);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedEventIdx, setSelectedEventIdx] = useState<number>(-1);

  const [creatingTiledEvents, setCreatingTiledEvents] = useState<boolean>(false);
  const [tileDetails, setTileDetails] = useState<TileDetails>({
    days: [],
    daysLinked: false,
    startTime: -1,
    endTime: -1,
    length: 60
  });

  // ref objects for tiled event details
  const tileRefs = {
    days: React.createRef<HTMLFormElement>(),
    startTime: React.createRef<HTMLInputElement>(),
    endTime: React.createRef<HTMLInputElement>(),
    length: React.createRef<HTMLInputElement>()
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
            endTime: t + tileDetails.length
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
        endTime: serializeTime(time.endTime)
      }));
      return {
        ...slot,
        times: times
      };
    });
    console.log(converted_slots);

    fetchWithMethod(`matcher/${profile.courseId}/slots`, HTTP_METHODS.POST, { slots: converted_slots });
  };

  const openForm = (): void => {
    // send POST request to release form for mentors
    fetchWithMethod(`matcher/${profile.courseId}/configure`, HTTP_METHODS.POST, { open: true }).then(() => {
      // recompute stage
      refreshStage();
    });
  };

  /**
   * Initialize event creation
   */
  const onEventBeginCreation = (): void => {
    setSelectedEvent(null);
    setSelectedEventIdx(-1);
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
  const deleteTime = (index: number, useSelected = false) => {
    if (useSelected) {
      const newSelectedEvent = { ...selectedEvent! };
      newSelectedEvent.times.splice(index, 1);
      if (newSelectedEvent.times.length === 0) {
        const newSlots = [...slots];
        newSlots.splice(selectedEventIdx!, 1);
        setSlots(newSlots);
        setSelectedEvent(null);
        setSelectedEventIdx(-1);
      } else {
        setSelectedEvent(newSelectedEvent);
      }
    } else {
      const newTimes = [...curCreatedTimes];
      newTimes.splice(index, 1);
      setCurCreatedTimes(newTimes);
    }
  };

  /**
   * Edit the day field of an event
   *
   * @param index       index of time to edit
   * @param newDay      new day value for time
   * @param useSelected whether to use selected event or the event currently being created
   */
  const editTime_day = (index: number, newDay: string, useSelected = false): void => {
    if (!DAYS.includes(newDay)) {
      return;
    }
    if (useSelected) {
      const newSelectedEvent = { ...selectedEvent! };
      newSelectedEvent.times[index].day = newDay;
      setSelectedEvent(newSelectedEvent);
    } else {
      const newTimes = [...curCreatedTimes];
      newTimes[index]["day"] = newDay;
      setCurCreatedTimes(newTimes);
    }
  };

  /**
   * Edit the start time field of an event
   *
   * @param index         index of time to edit
   * @param newStartTime  new start time value
   * @param useSelected   whether to use selected event or the event currently being created
   */
  const editTime_startTime = (index: number, newStartTime: string, useSelected = false) => {
    if (useSelected) {
      const newSelectedEvent = { ...selectedEvent! };
      newSelectedEvent.times[index].startTime = parseTime(newStartTime);
      setSelectedEvent(newSelectedEvent);
    } else {
      const newTimes = [...curCreatedTimes];
      newTimes[index]["startTime"] = parseTime(newStartTime);
      setCurCreatedTimes(newTimes);
    }
  };

  /**
   * Edit the end time field of an event
   *
   * @param index       index of time to edit
   * @param newEndTime  new end time value
   * @param useSelected whether to use selected event or the event currently being created
   */
  const editTime_endTime = (index: number, newEndTime: string, useSelected = false) => {
    if (useSelected) {
      const newSelectedEvent = { ...selectedEvent! };
      newSelectedEvent.times[index].endTime = parseTime(newEndTime);
      setSelectedEvent(newSelectedEvent);
    } else {
      const newTimes = [...curCreatedTimes];
      newTimes[index]["endTime"] = parseTime(newEndTime);
      setCurCreatedTimes(newTimes);
    }
  };

  const toggleCreatingTiledEvents = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const checked = e.target.checked;
    if (checked) {
      setSelectedEvent(null);
      setSelectedEventIdx(-1);
      setCurCreatedTimes([]);
      setTileDetails({
        ...tileDetails,
        days: [],
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

  const saveTiledEvents = () => {
    const newSlots = [];
    for (let t = tileDetails.startTime; t <= tileDetails.endTime - tileDetails.length; t += tileDetails.length) {
      if (tileDetails.daysLinked) {
        const newEvent: CalendarEvent = { times: [] };
        for (const day of tileDetails.days) {
          newEvent.times.push({ day: day, startTime: t, endTime: t + tileDetails.length });
        }
        newSlots.push(newEvent);
      } else {
        for (const day of tileDetails.days) {
          newSlots.push({ times: [{ day: day, startTime: t, endTime: t + tileDetails.length }] });
        }
      }
    }
    setSlots([...slots, ...newSlots]);
  };

  // const updateNumMentors = (e: React.ChangeEvent<HTMLInputElement>, useSelected = false) => {
  //   const newNumMentors = parseInt(e.target.value);
  //   if (isNaN(newNumMentors)) {
  //     return;
  //   }
  //   if (useSelected) {
  //     const newSlots = slots.map((slot, idx) => {
  //       if (idx === selectedEventIdx) {
  //         return {
  //           ...slot,
  //           num_mentors: newNumMentors
  //         };
  //       }
  //       return slot;
  //     });
  //     setSlots(newSlots);
  //     setSelectedEvent(newSlots[selectedEventIdx]);
  //   } else {
  //     setCurNumMentors(newNumMentors);
  //   }
  // };

  /**
   * Save the newly created event and times
   */
  const saveEvent = () => {
    const newEvent = { times: curCreatedTimes };
    setSlots([...slots, newEvent]);
    setCurCreatedTimes([]);
  };

  /**
   * Convert selected event into a newly created event for editing
   */
  const editSelectedEvent = () => {
    setCurCreatedTimes(selectedEvent!.times);
    const newSlots = [...slots];
    newSlots.splice(selectedEventIdx!, 1);
    setSlots(newSlots);
  };

  /**
   * Wrapper for handler when a time is clicked
   *
   * @param idx index of event to select
   */
  const setSelectedEventIdxWrapper = (idx: number) => {
    if (!creatingTiledEvents) {
      setSelectedEventIdx(idx);
      setSelectedEvent(slots[idx]);
    }
  };

  // const showSidebar = (event_idx: number) => {
  //   // console.log(event_idx);
  //   // setSelectedEventIdx(event_idx);
  //   setSelectedEvent(slots[event_idx]);
  // };

  /**
   * Render the details of an event in the sidebar
   *
   * @param event event with single time to render details for
   * @returns JSX for sidebar details
   */
  const getEventDetails = (event: CalendarEventSingleTime) => {
    return (
      <React.Fragment>
        <span className="calendar-event-detail-time">
          {formatTime(event.time.startTime)}&#8211;{formatTime(event.time.endTime)}
        </span>
        {/* <br />
        <span className="matcher-detail">Num. Mentors: {event.num_mentors}</span> */}
      </React.Fragment>
    );
  };

  let topContents = <div>Click and drag to create a new section, or click an existing section to edit.</div>;
  if (creatingTiledEvents) {
    topContents = (
      <div className="matcher-sidebar-tiling">
        <div className="matcher-sidebar-tiling-top">
          Create tiled events
          <br />
          Days: (
          <label>
            Link days <input type="checkbox" onChange={editTiled_linked} />
          </label>
          )
          <form className="tiling-day-container" ref={tileRefs.days} onChange={editTiled_day}>
            {DAYS.map(day => (
              <label key={day}>
                <input type="checkbox" value={day} />
                {day}
              </label>
            ))}
          </form>
          Range:
          <input
            type="time"
            ref={tileRefs.startTime}
            defaultValue={serializeTime(tileDetails.startTime)}
            onChange={e => editTiled_number("startTime", parseTime(e.target.value))}
          />
          &#8211;
          <input
            type="time"
            ref={tileRefs.endTime}
            defaultValue={serializeTime(tileDetails.endTime)}
            onChange={e => editTiled_number("endTime", parseTime(e.target.value))}
          />
          Length:
          <input
            type="number"
            ref={tileRefs.length}
            min={15}
            step={5}
            defaultValue={tileDetails.length}
            onChange={e => e.target.validity.valid && editTiled_number("length", parseInt(e.target.value))}
          />
        </div>
        <div className="matcher-sidebar-tiling-bottom">
          <button onClick={saveTiledEvents}>Save</button>
        </div>
      </div>
    );
  } else if (curCreatedTimes.length > 0) {
    topContents = (
      <div>
        Section Time{curCreatedTimes.length > 1 ? "s" : ""}:
        <div className="matcher-selected-times">
          {curCreatedTimes.map((time, time_idx) => (
            <div key={time_idx}>
              <XIcon className="icon matcher-remove-time-icon" onClick={() => deleteTime(time_idx)} />
              <select
                className="matcher-select-day-input"
                defaultValue={time.day}
                onChange={e => editTime_day(time_idx, e.target.value)}
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>
                    {DAYS_ABBREV[day]}
                  </option>
                ))}
              </select>
              <input
                className="matcher-select-time-input"
                type="time"
                defaultValue={serializeTime(time.startTime)}
                onChange={e => editTime_startTime(time_idx, e.target.value)}
              />
              &#8211;
              <input
                className="matcher-select-time-input"
                type="time"
                defaultValue={serializeTime(time.endTime)}
                onChange={e => editTime_endTime(time_idx, e.target.value)}
              />
            </div>
          ))}
        </div>
        {/* <div>
          Number of mentors:
          <input type="number" defaultValue={curNumMentors} onChange={updateNumMentors} />
        </div> */}
        <button onClick={saveEvent}>Save</button>
      </div>
    );
  } else if (selectedEvent !== null) {
    console.log(selectedEvent);
    topContents = (
      <div>
        Section Time{selectedEvent.times.length > 1 ? "s" : ""}
        <div className="matcher-selected-times">
          {selectedEvent.times.map((time, time_idx) => (
            <div key={time_idx}>
              <XIcon className="icon matcher-remove-time-icon" onClick={() => deleteTime(time_idx, true)} />
              <select
                defaultValue={time.day}
                key={`day_${time_idx}/${selectedEventIdx}`}
                onChange={e => editTime_day(time_idx, e.target.value, true)}
              >
                {DAYS.map(day => (
                  <option key={day} value={day}>
                    {day.slice(0, 3)}
                  </option>
                ))}
              </select>
              <input
                type="time"
                key={`start_${time_idx}/${selectedEventIdx}`}
                defaultValue={serializeTime(time.startTime)}
                onChange={e => editTime_startTime(time_idx, e.target.value, true)}
              />
              &#8211;
              <input
                type="time"
                key={`end_${time_idx}/${selectedEventIdx}`}
                defaultValue={serializeTime(time.endTime)}
                onChange={e => editTime_endTime(time_idx, e.target.value, true)}
              />
            </div>
          ))}
        </div>
        {/* <div>
          Number of mentors:
          <input
            type="number"
            key={selectedEventIdx}
            defaultValue={selectedEvent.num_mentors}
            onChange={e => updateNumMentors(e, true)}
          />
        </div> */}
        <button onClick={editSelectedEvent}>Edit</button>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="matcher-body">
        <div className="coordinator-sidebar-left">
          <div className="matcher-sidebar-left-top">{topContents}</div>
          <div className="matcher-sidebar-left-bottom">
            <label className="matcher-submit-btn toggle-tiling">
              <input type="checkbox" onChange={toggleCreatingTiledEvents} />
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
            selectedEventIdx={selectedEventIdx}
            setSelectedEventIdx={setSelectedEventIdxWrapper}
            createdTimes={curCreatedTimes}
            getEventDetails={getEventDetails}
            eventCreationEnabled={true}
            onEventBeginCreation={onEventBeginCreation}
            onEventCreated={updateTimes}
          />
        </div>
      </div>
      <div className="matcher-body-footer">
        <button className="matcher-submit-btn" onClick={openForm}>
          Release Form
        </button>
      </div>
    </React.Fragment>
  );
}
