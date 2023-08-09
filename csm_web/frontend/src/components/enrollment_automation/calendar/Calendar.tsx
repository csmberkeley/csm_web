import { DateTime, Duration, Interval } from "luxon";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DATETIME_INITIAL_INVALID, formatTime, INTERVAL_INITIAL_INVALID } from "../../../utils/datetime";

import { Time } from "../EnrollmentAutomationTypes";
import { CalendarDay, CalendarDayHeader } from "./CalendarDay";
import { CalendarEvent, CalendarEventSingleTime, DAYS } from "./CalendarTypes";

// Styles
import "../../../css/calendar.scss";

// default start and end times for calendar
const START = DateTime.fromObject({ hour: 8, minute: 0 }); // 8:00 AM
const END = DateTime.fromObject({ hour: 18, minute: 0 }); // 6:00 PM
const INTERVAL_LENGTH = Duration.fromObject({ minutes: 30 });
const SCROLL_AMT = Duration.fromObject({ minutes: 30 });

const MIN = DateTime.fromObject({ hour: 0, minute: 0 });
const MAX = DateTime.fromObject({ hour: 24, minute: 0 });

const WIDTH_SCALE = 0.9;

interface CalendarProps {
  events: CalendarEvent[];
  createdTimes: Time[];
  onEventClick: (event_idx: number) => void;
  getEventDetails: (event: CalendarEventSingleTime) => React.ReactElement;
  eventCreationEnabled: boolean;
  onEventBeginCreation: (time: Time) => void;
  onEventCreated: (time: Time) => void;
  selectedEventIndices: number[];
  setSelectedEventIndices: (indices: number[]) => void;
  disableHover: boolean;
  limitScrolling: boolean;
  brighterLinkedTimes: boolean;
  /**
   * Whether the event details should be flush with container edges
   */
  flushDetails: boolean;
}

export function Calendar({
  events,
  createdTimes,
  onEventClick,
  getEventDetails,
  eventCreationEnabled,
  onEventBeginCreation,
  onEventCreated,
  selectedEventIndices,
  setSelectedEventIndices,
  disableHover,
  limitScrolling,
  brighterLinkedTimes,
  flushDetails
}: CalendarProps): React.ReactElement {
  /**
   * User viewing bounds of the calendar events.
   */
  const [viewBounds, setViewBounds] = useState<Interval>(Interval.fromDateTimes(START, END));

  /** Height of an interval in pixels. */
  const [intervalHeight, setIntervalHeight] = useState<number>(0);
  /** Width of an interval in pixels; takes `WIDTH_SCALE` into account. */
  const [intervalWidth, setIntervalWidth] = useState<number>(0);
  /** Index of the current event the user is hovering over. */
  const [eventHoverIndex, setEventHoverIndex] = useState<number>(-1);

  /**
   * Whether the user is currently creating an event.
   */
  const [creatingEvent, setCreatingEvent] = useState<boolean>(false);
  /**
   * The event that should be shown as the user is in the process of dragging to create a new event.
   *
   * While dragging, the end time may be before the start time;
   * the start time is set on mouse down, and the end time is set during dragging
   * and on mouse up.
   *
   * @see normalizeCreatedEvent - creates a valid event from the information here;
   *    in particular, swaps the start and end time if the end time is prior to the start time.
   */
  const [curCreatedEvent, setCurCreatedEvent] = useState<{
    day: string;
    start: DateTime;
    end: DateTime;
    isLinked: boolean;
  }>({
    day: "",
    start: DATETIME_INITIAL_INVALID,
    end: DATETIME_INITIAL_INVALID,
    isLinked: false
  });

  /**
   * Union of all event intervals.
   *
   * This is used for limiting how much the user can scroll the calendar viewport.
   */
  const eventExtrema = useMemo(() => {
    return (
      events.reduce((curExtrema: Interval | null, event) => {
        return event.times.reduce((merged, current) => {
          if (merged == null) {
            return current.interval;
          } else {
            return merged.union(current.interval);
          }
        }, curExtrema);
      }, null) ?? Interval.invalid("no events")
    );
  }, [events]);

  /** Re-register scroll listener whenever the extrema states change; otherwise, `scrollView` uses stale values. */
  useEffect(() => {
    calendarBodyRef.current?.addEventListener<"wheel">("wheel", scrollView, { passive: false });
    return () => {
      calendarBodyRef.current?.removeEventListener("wheel", scrollView);
    };
  }, [eventExtrema]);

  /** Reference for the calendar body mousewheel event listener. */
  const calendarBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = document.getElementsByClassName("calendar-day-interval").item(0);
    const rect = interval!.getBoundingClientRect();
    setIntervalHeight(rect.height);
    setIntervalWidth(rect.width * WIDTH_SCALE);

    const resizeHandler = () => {
      const interval = document.getElementsByClassName("calendar-day-interval").item(0);
      const rect = interval!.getBoundingClientRect();
      setIntervalHeight(rect.height);
      setIntervalWidth(rect.width * WIDTH_SCALE);
    };

    window.addEventListener("resize", resizeHandler);
    return () => {
      window.removeEventListener("resize", resizeHandler);
    };
  }, []);

  const mouseupListener = (e: MouseEvent) => {
    onCreateDragEndCancel(e);
  };
  const blurListener = (e: FocusEvent) => {
    onCreateDragEndCancel(e);
  };

  /**
   * Add event listeners for canceling drag events.
   *
   * In particular, if the user releases the mouse outside of the calendar,
   * or unfocuses from the window, the drag should be canceled.
   *
   * Cleans up event listeners when the component is destroyed.
   *
   * If event creation is not enabled, the event listeners are not added;
   * this reduces the amount of attached event listeners in the window.
   */
  useEffect(() => {
    window.removeEventListener("mouseup", mouseupListener);
    window.removeEventListener("blur", blurListener);

    if (eventCreationEnabled) {
      window.addEventListener("mouseup", mouseupListener);
      window.addEventListener("blur", blurListener);

      return () => {
        window.removeEventListener("mouseup", mouseupListener);
        window.removeEventListener("blur", blurListener);
      };
    }
  }, [eventCreationEnabled]);

  /**
   * Scroll the calendar view.
   *
   * @param e - scroll event
   */
  const scrollView = (e: WheelEvent) => {
    if (
      !eventExtrema.isValid ||
      (limitScrolling &&
        eventExtrema.start! >= viewBounds.start!.plus(Duration.fromObject({ hours: 1 })) &&
        eventExtrema.end! <= viewBounds.end!.minus(Duration.fromObject({ hours: 1 })))
    ) {
      // everything is in the viewport; don't scroll
      return;
    }

    // prevent page scroll
    e.preventDefault();

    // use set state functions to update successive scrolls
    if (e.deltaY < 0) {
      // don't update past midnight
      setViewBounds(prevBounds => {
        if (prevBounds.start! >= MIN.plus(SCROLL_AMT)) {
          return prevBounds.mapEndpoints(datetime => datetime.minus(SCROLL_AMT));
        } else {
          return prevBounds;
        }
      });
    } else if (e.deltaY > 0) {
      // don't update past midnight
      setViewBounds(prevBounds => {
        if (prevBounds.end! <= MAX.minus(SCROLL_AMT)) {
          return prevBounds.mapEndpoints(datetime => datetime.plus(SCROLL_AMT));
        } else {
          return prevBounds;
        }
      });
    }
  };

  /**
   * Categorized events by day; memoized, since this only changes if the events change.
   *
   * The resulting categorized event includes the original index in the events list.
   */
  const categorizedEvents = useMemo(() => {
    const newCategorizedEvents: {
      [day: string]: { event_idx: number; event: CalendarEventSingleTime; isLinked: boolean }[];
    } = {};

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      const { times, ...rest } = event;
      const isLinked = times.length > 1;
      for (const time of times) {
        if (!newCategorizedEvents[time.day]) {
          newCategorizedEvents[time.day] = [];
        }

        const newEvent: CalendarEventSingleTime = {
          time,
          ...rest
        };

        newCategorizedEvents[time.day].push({
          event_idx: i,
          event: newEvent,
          isLinked
        });
      }
    }
    return newCategorizedEvents;
  }, [events]);

  /**
   * Wrapper for when an event is clicked.
   *
   * @param index - event index in array
   * @param add - whether to add event or replace existing events
   */
  const eventClickWrapper = (index: number, add: boolean) => {
    let newSelectedEventIndices;
    if (add) {
      if (selectedEventIndices.includes(index)) {
        newSelectedEventIndices = selectedEventIndices.filter(i => i !== index);
      } else {
        newSelectedEventIndices = [...selectedEventIndices, index];
      }
    } else {
      newSelectedEventIndices = [index];
    }
    setSelectedEventIndices(newSelectedEventIndices);
    onEventClick(index);
  };

  /**
   * Event handler for when the user begins to drag in the calendar to create a new event.
   *
   * @param day - the day (column) the user started dragging in
   * @param interval - the time interval (row) the user started dragging in
   */
  const onCreateDragStart = (day: string, interval: Interval) => {
    if (!eventCreationEnabled) {
      return;
    }
    setCurCreatedEvent({
      day,
      start: interval.start!,
      end: interval.end!,
      isLinked: createdTimes.length > 0
    });
    setCreatingEvent(true);
    setEventHoverIndex(-1);
    setSelectedEventIndices([]);
    onEventBeginCreation(normalizeCreatedEvent());
  };

  /**
   * Event handler for when the user drags over a new interval when creating a new event.
   *
   * Changes only the end time of the currently created event.
   *
   * @param day - the day (column) the user is currently dragging over
   * @param interval - the time interval (row) the user is currently dragging over
   */
  const onCreateDragOver = (day: string, interval: Interval) => {
    if (!eventCreationEnabled || !creatingEvent) {
      return;
    }
    setCurCreatedEvent({
      ...curCreatedEvent,
      end: interval.end!
    });
  };

  /**
   * Event handler for when the user stops dragging when creating a new event.
   *
   * @param day - the day (column) the user ended the drag in
   * @param interval - the time interval (row) the user ended the drag in
   */
  const onCreateDragEnd = (day: string, interval: Interval) => {
    if (!eventCreationEnabled || !creatingEvent) {
      return;
    }
    onEventCreated(normalizeCreatedEvent());
    setCurCreatedEvent({
      day: "",
      start: DATETIME_INITIAL_INVALID,
      end: DATETIME_INITIAL_INVALID,
      isLinked: false
    });
    setCreatingEvent(false);
  };

  /**
   * Event handler for when the user cancels dragging during event creation.
   *
   * @param e - event that caused the cancellation of the drag
   */
  const onCreateDragEndCancel = (e: MouseEvent | FocusEvent) => {
    setCurCreatedEvent({
      day: "",
      start: DATETIME_INITIAL_INVALID,
      end: DATETIME_INITIAL_INVALID,
      isLinked: false
    });
    setCreatingEvent(false);
  };

  /** Normalze the current event being created, to prepare for the finalization of the new event. */
  const normalizeCreatedEvent = () => {
    let interval = INTERVAL_INITIAL_INVALID;
    if (!curCreatedEvent.start.isValid || !curCreatedEvent.end.isValid) {
      // invalid endpoints, so use an invalid interval
    } else if (curCreatedEvent.start < curCreatedEvent.end) {
      // no need to swap; create interval normally
      interval = Interval.fromDateTimes(curCreatedEvent.start, curCreatedEvent.end);
    } else if (curCreatedEvent.start >= curCreatedEvent.end) {
      interval = Interval.fromDateTimes(
        // shift event end, since it's set from the interval end and needs to be the interval start.
        curCreatedEvent.end.minus(INTERVAL_LENGTH),
        // shift event start, since it's set from the initial interval start,
        // and needs to be the interval end in order to include the cell the user started at.
        curCreatedEvent.start.plus(INTERVAL_LENGTH)
      );
    }

    return {
      day: curCreatedEvent.day,
      interval,
      isLinked: curCreatedEvent.isLinked
    };
  };

  return (
    <div className="calendar">
      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-header-left">PST</div>
          {DAYS.map((day, idx) => (
            <CalendarDayHeader key={idx} day={day} />
          ))}
        </div>
        <div className="calendar-body" ref={calendarBodyRef}>
          <CalendarLabels interval={viewBounds} intervalLength={INTERVAL_LENGTH} />
          {DAYS.map((day, idx) => (
            <CalendarDay
              key={idx}
              day={day}
              interval={viewBounds}
              intervalLength={INTERVAL_LENGTH}
              eventHoverIndex={disableHover ? -1 : eventHoverIndex}
              eventSelectIndices={selectedEventIndices}
              events={categorizedEvents[day] || []}
              curCreatedTimes={createdTimes}
              curCreatedTime={normalizeCreatedEvent()}
              intervalHeight={intervalHeight}
              intervalWidth={intervalWidth}
              onEventHover={
                disableHover
                  ? () => {
                      /* do nothing */
                    }
                  : setEventHoverIndex
              }
              onEventClick={eventClickWrapper}
              onCreateDragStart={onCreateDragStart}
              onCreateDragOver={onCreateDragOver}
              onCreateDragEnd={onCreateDragEnd}
              getEventDetails={getEventDetails}
              brighterLinkedTimes={brighterLinkedTimes}
              flushDetails={flushDetails}
            ></CalendarDay>
          ))}
        </div>
      </div>
    </div>
  );
}

Calendar.defaultProps = {
  createdTimes: [],
  onEventClick: () => {
    /* do nothing */
  },
  onEventBeginCreation: () => {
    /* do nothing */
  },
  onEventCreated: () => {
    /* do nothing */
  },
  disableHover: false,
  limitScrolling: false,
  brighterLinkedTimes: true,
  flushDetails: false
};

interface CalendarLabelsProps {
  interval: Interval;
  intervalLength: Duration;
}

function CalendarLabels({ interval, intervalLength }: CalendarLabelsProps): React.ReactElement {
  const labels: React.ReactElement[] = [];
  for (let d = interval.start!; d < interval.end!; d = d.plus(intervalLength)) {
    labels.push(
      <div className="calendar-label" key={d.toMillis()}>
        {d.get("minute") % 60 == 0 ? formatTime(d) : ""}
      </div>
    );
  }

  return <div className="calendar-labels">{labels}</div>;
}
