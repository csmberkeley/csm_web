import React, { useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "../utils";
import { CalendarDay, CalendarDayHeader } from "./CalendarDay";
import { CalendarEvent, CalendarEventSingleTime, DAYS } from "./CalendarTypes";

// default start and end times for calendar
const START = 8 * 60 + 0; // 8:00 AM
const END = 18 * 60 + 0; // 6:00 PM
const INTERVAL_LENGTH = 30;
const SCROLL_AMT = 30;

const WIDTH_SCALE = 0.9;

interface Time {
  day: string;
  startTime: number;
  endTime: number;
  isLinked: boolean; // whether this time is linked to another within a section
}

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
  const [viewBounds, setViewBounds] = useState<{ start: number; end: number }>({ start: START, end: END });

  const [intervalHeight, setIntervalHeight] = useState<number>(0);
  const [intervalWidth, setIntervalWidth] = useState<number>(0);
  const [eventHoverIndex, setEventHoverIndex] = useState<number>(-1);

  const [creatingEvent, setCreatingEvent] = useState<boolean>(false);
  const [curCreatedEvent, setCurCreatedEvent] = useState<Time>({
    day: "",
    startTime: -1,
    endTime: -1,
    isLinked: false
  });

  const [eventExtrema, setEventExtrema] = useState<{ min: number; max: number }>({
    min: Number.MIN_VALUE,
    max: Number.MAX_VALUE
  });

  useEffect(() => {
    const newExtrema = events.reduce(
      ({ min, max }, event) => {
        const start = Math.min(...event.times.map(t => t.startTime));
        const end = Math.max(...event.times.map(t => t.endTime));
        return { min: Math.min(min, start), max: Math.max(max, end) };
      },
      { min: Number.MAX_VALUE, max: Number.MIN_VALUE }
    );
    setEventExtrema(newExtrema);
  }, [events]);

  // re-register scroll listener whenever the extrema states change; otherwise, scrollView uses stale values
  useEffect(() => {
    calendarBodyRef.current?.addEventListener<"wheel">("wheel", scrollView, { passive: false });
    return () => {
      calendarBodyRef.current?.removeEventListener("wheel", scrollView);
    };
  }, [eventExtrema]);

  // reference for calendar body mousewheel event listener
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

  const scrollView = (e: WheelEvent) => {
    if (limitScrolling && eventExtrema.min >= viewBounds.start + 60 && eventExtrema.max <= viewBounds.end - 60) {
      // everything is in the viewport; don't scroll
      return;
    }

    // prevent page scroll
    e.preventDefault();

    // use set state functions to update successive scrolls
    if (e.deltaY < 0) {
      // don't update past midnight
      setViewBounds(prevBounds => {
        if (prevBounds.start >= SCROLL_AMT) {
          return {
            start: prevBounds.start - SCROLL_AMT,
            end: prevBounds.end - SCROLL_AMT
          };
        } else {
          return prevBounds;
        }
      });
    } else if (e.deltaY > 0) {
      // don't update past midnight
      const limit = 24 * 60 - SCROLL_AMT;
      setViewBounds(prevBounds => {
        if (prevBounds.end <= limit) {
          return {
            start: prevBounds.start + SCROLL_AMT,
            end: prevBounds.end + SCROLL_AMT
          };
        } else {
          return prevBounds;
        }
      });
    }
  };

  const categorizedEvents: { [day: string]: any } = {};

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const { times, ...rest } = event;
    const isLinked = times.length > 1;
    for (const time of times) {
      if (!categorizedEvents[time.day]) {
        categorizedEvents[time.day] = [];
      }

      const newEvent: CalendarEventSingleTime = {
        time,
        ...rest
      };

      categorizedEvents[time.day].push({
        event_idx: i,
        event: newEvent,
        isLinked
      });
    }
  }

  /**
   * Wrapper for when an event is clicked.
   *
   * @param index event index in array
   * @param add whether to add event or replace existing events
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

  const onCreateDragStart = (day: string, startTime: number, endTime: number) => {
    if (!eventCreationEnabled) {
      return;
    }
    setCurCreatedEvent({ day, startTime, endTime, isLinked: createdTimes.length > 0 });
    setCreatingEvent(true);
    setEventHoverIndex(-1);
    setSelectedEventIndices([]);
    onEventBeginCreation(normalizeCreatedEvent());
  };

  const onCreateDragOver = (day: string, start_time: number, end_time: number) => {
    if (!eventCreationEnabled || !creatingEvent) {
      return;
    }
    setCurCreatedEvent({
      day: curCreatedEvent.day,
      startTime: curCreatedEvent.startTime,
      endTime: end_time,
      isLinked: curCreatedEvent.isLinked
    });
  };

  const onCreateDragEnd = (day: string, start_time: number, end_time: number) => {
    if (!eventCreationEnabled || !creatingEvent) {
      return;
    }
    onEventCreated(normalizeCreatedEvent());
    setCurCreatedEvent({ day: "", startTime: -1, endTime: -1, isLinked: false });
    setCreatingEvent(false);
  };

  const onCreateDragEndCancel = (e: MouseEvent | FocusEvent) => {
    setCurCreatedEvent({ day: "", startTime: -1, endTime: -1, isLinked: false });
    setCreatingEvent(false);
  };

  const normalizeCreatedEvent = () => {
    if (curCreatedEvent.startTime < curCreatedEvent.endTime) {
      return curCreatedEvent;
    } else {
      return {
        day: curCreatedEvent.day,
        startTime: curCreatedEvent.endTime - INTERVAL_LENGTH,
        endTime: curCreatedEvent.startTime + INTERVAL_LENGTH,
        isLinked: curCreatedEvent.isLinked
      };
    }
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
          <CalendarLabels startTime={viewBounds.start} endTime={viewBounds.end} intervalLength={INTERVAL_LENGTH} />
          {DAYS.map((day, idx) => (
            <CalendarDay
              key={idx}
              day={day}
              startTime={viewBounds.start}
              endTime={viewBounds.end}
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
  startTime: number;
  endTime: number;
  intervalLength: number;
}

function CalendarLabels({ startTime, endTime, intervalLength }: CalendarLabelsProps): React.ReactElement {
  const labels: React.ReactElement[] = [];
  for (let i = startTime; i < endTime; i += intervalLength) {
    labels.push(
      <div className="calendar-label" key={i}>
        {i % 60 == 0 ? formatTime(i) : ""}
      </div>
    );
  }

  return <div className="calendar-labels">{labels}</div>;
}
