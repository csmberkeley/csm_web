import _ from "lodash";
import { DateTime, Duration, Interval } from "luxon";
import React, { createRef, useEffect, useState } from "react";

import { formatInterval } from "../../../utils/datetime";
import { useMatcherSlotsMutation } from "../../../utils/queries/matcher";
import { Profile } from "../../../utils/types";
import Modal from "../../Modal";
import { Tooltip } from "../../Tooltip";
import { Slot, Time } from "../EnrollmentAutomationTypes";
import { Calendar } from "../calendar/Calendar";
import { CalendarEvent, CalendarEventSingleTime, DAYS, DAYS_ABBREV } from "../calendar/CalendarTypes";
import { parseTime, serializeTime } from "../utils";

import InfoIcon from "../../../../static/frontend/img/info.svg";
import XIcon from "../../../../static/frontend/img/x.svg";

interface TileDetails {
  days: string[];
  daysLinked: boolean;
  start: DateTime;
  end: DateTime;
  length: Duration;
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
    daysLinked: false,
    start: DateTime.invalid("initial value"),
    end: DateTime.invalid("initial value"),
    length: Duration.fromObject({ hours: 1 })
  });

  /**
   * Whether or not anything has been edited
   */
  const [edited, setEdited] = useState<boolean>(false);

  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);

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
    days: createRef<HTMLFormElement>(),
    startTime: createRef<HTMLInputElement>(),
    endTime: createRef<HTMLInputElement>(),
    length: createRef<HTMLInputElement>(),
    toggle: createRef<HTMLInputElement>()
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
    const interval = Interval.fromDateTimes(tileDetails.start, tileDetails.end);
    if (interval.isValid && tileDetails.length.isValid) {
      const newTimes: Time[] = [];
      for (let t = interval.start!; t <= interval.end!.minus(tileDetails.length); t = t.plus(tileDetails.length)) {
        for (const day of tileDetails.days) {
          newTimes.push({
            day: day,
            interval: Interval.fromDateTimes(t, t.plus(tileDetails.length)),
            // linked only if there are multiple days and user wants to link them
            isLinked: tileDetails.daysLinked && tileDetails.days.length > 1
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
        startTime: serializeTime(time.interval.start!),
        endTime: serializeTime(time.interval.end!)
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
   * @param time - new time to add
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
        tileRefs.startTime.current.value = serializeTime(time.interval.start!);
      }
      if (tileRefs.endTime.current) {
        tileRefs.endTime.current.value = serializeTime(time.interval.end!);
      }
      if (tileRefs.length.current) {
        tileRefs.length.current.value = tileDetails.length.as("minutes").toString();
      }
      setTileDetails({
        ...tileDetails,
        days: [time.day],
        start: time.interval.start ?? DateTime.invalid("initial value"),
        end: time.interval.end ?? DateTime.invalid("initial value")
      });
    } else {
      const newTimes = [...curCreatedTimes, time];
      setCurCreatedTimes(newTimes);
    }
  };

  /**
   * Delete a time from current event
   *
   * @param index - index of time to remove
   * @param useSelected - whether to use selected event or the event currently being created
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
   * @param index - index of time to edit
   * @param newDay - new day value for time
   * @param useSelected - whether to use selected event or the event currently being created
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
   * @param index - index of time to edit
   * @param newStartTime - new start time value
   * @param useSelected - whether to use selected event or the event currently being created
   */
  const editTime_startTime = (index: number, newStartTime: string) => {
    const newTimes = [...curCreatedTimes];
    newTimes[index].interval = Interval.fromDateTimes(parseTime(newStartTime), newTimes[index].interval.end!);
    setCurCreatedTimes(newTimes);
  };

  /**
   * Edit the end time field of an event
   *
   * @param index - index of time to edit
   * @param newEndTime - new end time value
   * @param useSelected - whether to use selected event or the event currently being created
   */
  const editTime_endTime = (index: number, newEndTime: string) => {
    const newTimes = [...curCreatedTimes];
    newTimes[index].interval = Interval.fromDateTimes(newTimes[index].interval.start!, parseTime(newEndTime));
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
        daysLinked: false,
        start: DateTime.invalid("initial value"),
        end: DateTime.invalid("initial value")
      });
    } else {
      setCurCreatedTimes([]);
    }
    setCreatingTiledEvents(checked);
  };

  const editTiled_interval = (endpoint: "start" | "end", datetime: DateTime): void => {
    let newDetails = null;
    if (endpoint === "start") {
      newDetails = {
        ...tileDetails,
        start: datetime
      };
    } else if (endpoint === "end") {
      newDetails = {
        ...tileDetails,
        end: datetime
      };
    }

    if (newDetails != null) {
      setTileDetails(newDetails);
    }
  };

  const editTiled_length = (duration: number): void => {
    if (isNaN(duration)) {
      return;
    }

    const newDetails = { ...tileDetails, length: Duration.fromObject({ minutes: duration }) };
    setTileDetails(newDetails);
  };

  const editTiled_day = (): void => {
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
    for (let t = tileDetails.start; t <= tileDetails.end.minus(tileDetails.length); t = t.plus(tileDetails.length)) {
      if (tileDetails.daysLinked) {
        const newEvent: CalendarEvent = { times: [] };
        for (const day of tileDetails.days) {
          newEvent.times.push({
            day: day,
            interval: Interval.fromDateTimes(t, t.plus(tileDetails.length)),
            isLinked: tileDetails.days.length > 1
          });
        }
        newSlots.push(newEvent);
      } else {
        for (const day of tileDetails.days) {
          newSlots.push({
            times: [{ day: day, interval: Interval.fromDateTimes(t, t.plus(tileDetails.length)), isLinked: false }]
          });
        }
      }
    }
    setSlots([...slots, ...newSlots]);
    // stop creating tiled events
    tileRefs.toggle.current!.checked = false;
    toggleCreatingTiledEvents({ target: tileRefs.toggle.current! } as React.ChangeEvent<HTMLInputElement>);
  };

  /**
   * Save the newly created event and times
   */
  const saveEvent = () => {
    const newEvent = { times: curCreatedTimes };
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
      setSlots([...slots, savedExistingEvent]);
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
        <span className="calendar-event-detail-time">{formatInterval(event.time.interval)}</span>
        {/* <br />
        <span className="matcher-detail">Num. Mentors: {event.num_mentors}</span> */}
      </React.Fragment>
    );
  };

  /**
   * Confirm modal prior to submitting the slots.
   */
  let slotConfirmModal = null;
  if (showConfirmModal) {
    const linkedSlots = slots
      .filter(slot => slot.times.some(time => time.isLinked))
      .sort((a, b) => {
        return (
          Math.min(...a.times.map(time => DAYS.indexOf(time.day))) -
          Math.min(...b.times.map(time => DAYS.indexOf(time.day)))
        );
      });
    const unlinkedSlots = slots
      .filter(slot => slot.times.every(time => !time.isLinked))
      .sort((a, b) => {
        let diff =
          Math.min(...a.times.map(time => DAYS.indexOf(time.day))) -
          Math.min(...b.times.map(time => DAYS.indexOf(time.day)));
        if (diff != 0) return diff;

        diff =
          Math.min(...a.times.map(time => time.interval.start?.toUnixInteger() ?? 0)) -
          Math.min(...b.times.map(time => time.interval.start?.toUnixInteger() ?? 0));
        return diff;
      });

    if (slots.length > 0) {
      const formattedLinkedSlots = linkedSlots.map((slot, slotIdx) => (
        <li className="matcher-confirm-modal-list-item" key={slotIdx}>
          {slot.times.map((time, timeIdx) => (
            <React.Fragment key={timeIdx}>
              <span>
                {time.day} {formatInterval(time.interval)}
              </span>
              {timeIdx < slot.times.length - 1 && <br />}
            </React.Fragment>
          ))}
        </li>
      ));
      const formattedUnlinkedSlots = unlinkedSlots.map((slot, slotIdx) => (
        <li className="matcher-confirm-modal-list-item" key={slotIdx}>
          {slot.times.map((time, timeIdx) => (
            <React.Fragment key={timeIdx}>
              <span>
                {time.day} {formatInterval(time.interval)}
              </span>
              {timeIdx < slot.times.length - 1 && <br />}
            </React.Fragment>
          ))}
        </li>
      ));

      slotConfirmModal = (
        <Modal closeModal={() => setShowConfirmModal(false)}>
          <h2 className="matcher-confirm-modal-header">
            Submit {slots.length} slot{slots.length > 1 && "s"}?
          </h2>
          <h3>Linked Slots</h3>
          {linkedSlots.length > 0 ? (
            <ul className="matcher-confirm-modal-list">{formattedLinkedSlots}</ul>
          ) : (
            <p className="matcher-confirm-modal-empty-list-text">No linked slots.</p>
          )}
          <h3>Individual Slots</h3>
          {unlinkedSlots.length > 0 ? (
            <React.Fragment>
              <ul className="matcher-confirm-modal-list">{formattedUnlinkedSlots}</ul>
            </React.Fragment>
          ) : (
            <p className="matcher-confirm-modal-empty-list-text">No individual slots.</p>
          )}
          <div className="matcher-confirm-modal-buttons">
            <button className="secondary-btn" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
            <button
              className="primary-btn"
              onClick={() => {
                setShowConfirmModal(false);
                postSlots();
              }}
            >
              Submit
            </button>
          </div>
        </Modal>
      );
    } else {
      // empty slots
      slotConfirmModal = (
        <Modal closeModal={() => setShowConfirmModal(false)}>
          <h2 className="matcher-confirm-modal-header">Clear Slots?</h2>
          <p>No slots to submit.</p>
          <p>
            <b>This will clear all existing slots from the database.</b>
          </p>
          <div className="matcher-confirm-modal-buttons">
            <button className="secondary-btn" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </button>
            <button
              className="danger-btn"
              onClick={() => {
                setShowConfirmModal(false);
                postSlots();
              }}
            >
              Clear slots
            </button>
          </div>
        </Modal>
      );
    }
  }

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
                  <input type="checkbox" onChange={editTiled_linked} />
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
              <div className="matcher-tiling-range-input-container">
                <input
                  className="form-date light"
                  type="time"
                  ref={tileRefs.startTime}
                  defaultValue={tileDetails.start.isValid ? serializeTime(tileDetails.start) : ""}
                  step="900"
                  onChange={e => editTiled_interval("start", parseTime(e.target.value))}
                />
                &#8211;
                <input
                  className="form-date light"
                  type="time"
                  ref={tileRefs.endTime}
                  defaultValue={tileDetails.end.isValid ? serializeTime(tileDetails.end) : ""}
                  step="900"
                  onChange={e => editTiled_interval("end", parseTime(e.target.value))}
                />
              </div>
            </div>
            <div className="matcher-tiling-length-container">
              <div className="matcher-tiling-subheader">Length:</div>
              <div className="matcher-tiling-length-input-container">
                <input
                  className="matcher-tiling-length-input form-input light"
                  type="number"
                  ref={tileRefs.length}
                  min={15}
                  step={5}
                  defaultValue={tileDetails.length.as("minutes")}
                  onChange={e => e.target.validity.valid && editTiled_length(parseInt(e.target.value))}
                />
                mins
              </div>
            </div>
          </div>
        </div>
        <div className="matcher-sidebar-tiling-bottom">
          <button className="secondary-btn" onClick={saveTiledEvents}>
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
                  <select
                    className="form-select light matcher-created-time-day-input"
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
                    className="form-date light"
                    type="time"
                    key={`start_${time_idx}/${selectedEventIndices}`}
                    defaultValue={serializeTime(time.interval.start!)}
                    step="900"
                    onChange={e => editTime_startTime(time_idx, e.target.value)}
                  />
                  &#8211;
                  <input
                    className="form-date light"
                    type="time"
                    key={`end_${time_idx}/${selectedEventIndices}`}
                    defaultValue={serializeTime(time.interval.end!)}
                    step="900"
                    onChange={e => editTime_endTime(time_idx, e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="matcher-sidebar-create-bottom">
          <div className="matcher-sidebar-create-bottom-row">
            <button className="secondary-btn" onClick={saveEvent}>
              Save
            </button>
            <button className="secondary-btn" onClick={cancelEvent}>
              Cancel
            </button>
          </div>
          <div className="matcher-sidebar-create-bottom-row">
            <button className="danger-btn" onClick={deleteEvent}>
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
                      {time.day} {formatInterval(time.interval)}
                    </span>
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
              <button className="secondary-btn" onClick={editSelectedEvent}>
                Edit
              </button>
            </div>
          )}
          <div className="matcher-sidebar-selected-bottom-row">
            <button className="danger-btn" onClick={deleteSelectedEvent}>
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
            <label className="secondary-btn">
              <input type="checkbox" onChange={toggleCreatingTiledEvents} ref={tileRefs.toggle} />
              Create tiled events
            </label>
            <button className="primary-btn" onClick={() => setShowConfirmModal(true)}>
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
        <button className="primary-btn" onClick={nextStage} disabled={edited}>
          Continue
        </button>
      </div>
      {showConfirmModal && slotConfirmModal}
    </React.Fragment>
  );
}
