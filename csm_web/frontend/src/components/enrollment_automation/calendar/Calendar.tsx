import React, { Ref, useEffect, useRef, useState } from "react";
import { CalendarDay, CalendarDayHeader } from "./CalendarDay";
import { CalendarEvent, CalendarEventSingleTime, DAYS } from "./CalendarTypes";

// default start and end times for calendar
const START = 8 * 60 + 0; // 8:00 AM
const END = 18 * 60 + 0; // 6:00 PM
const INTERVAL_LENGTH = 30;
const SCROLL_AMT = 30;

/**
 * Format time as HH:MM AM/PM
 * @param mins number of minutes past midnight
 */
function formatMinutes(mins: number): string {
  const hours_24 = Math.floor(mins / 60);
  // if hours is 0, use 12 instead
  const hours = hours_24 % 12 || 12;
  const minutes = mins % 60;
  const ampm = hours_24 >= 12 ? "PM" : "AM";
  if (minutes == 0) {
    return `${hours > 12 ? hours % 12 : hours} ${ampm}`;
  }
  return `${hours > 12 ? hours % 12 : hours}:${minutes < 10 ? "0" : ""}${minutes} ${ampm}`;
}

interface Time {
  day: string;
  startTime: number;
  endTime: number;
}

interface CalendarProps {
  events: CalendarEvent[];
  createdTimes: Time[];
  onEventClick: (event_idx: number) => void;
  getEventDetails: (event: CalendarEventSingleTime) => React.ReactElement;
  eventCreationEnabled: boolean;
  onEventBeginCreation: (time: Time) => void;
  onEventCreated: (time: Time) => void;
  selectedEventIdx: number;
  setSelectedEventIdx: (idx: number) => void;
  disableHover: boolean;
}

export function Calendar({
  events,
  selectedEventIdx,
  createdTimes,
  onEventClick,
  getEventDetails,
  eventCreationEnabled,
  onEventBeginCreation,
  onEventCreated,
  setSelectedEventIdx,
  disableHover
}: CalendarProps): React.ReactElement {
  const [viewBounds, setViewBounds] = useState<{ start: number; end: number }>({ start: START, end: END });

  const [intervalHeight, setIntervalHeight] = useState<number>(0);
  const [eventHoverIndex, setEventHoverIndex] = useState<number>(-1);

  const [creatingEvent, setCreatingEvent] = useState<boolean>(false);
  const [curCreatedEvent, setCurCreatedEvent] = useState<Time>({
    day: "",
    startTime: -1,
    endTime: -1
  });

  // reference for calendar body mousewheel event listener
  const calendarBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = document.getElementsByClassName("calendar-day-interval").item(0);
    console.log(interval);
    setIntervalHeight(interval!.getBoundingClientRect().height);

    calendarBodyRef.current?.addEventListener<"wheel">("wheel", scrollView, { passive: false });
    return () => {
      calendarBodyRef.current?.removeEventListener("wheel", scrollView);
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
        event: newEvent
      });
    }
  }

  const eventClickWrapper = (index: number) => {
    setSelectedEventIdx(index);
    onEventClick(index);
  };

  const onCreateDragStart = (day: string, startTime: number, endTime: number) => {
    if (!eventCreationEnabled) {
      return;
    }
    console.log("onMouseDownInterval " + day + " " + startTime + " " + endTime);
    setCurCreatedEvent({ day, startTime, endTime });
    setCreatingEvent(true);
    setEventHoverIndex(-1);
    setSelectedEventIdx(-1);
    onEventBeginCreation(normalizeCreatedEvent());
  };

  const onCreateDragOver = (day: string, start_time: number, end_time: number) => {
    if (!eventCreationEnabled || !creatingEvent) {
      return;
    }
    console.log("onMouseMoveInterval " + day + " " + start_time + " " + end_time);
    setCurCreatedEvent({
      day: curCreatedEvent.day,
      startTime: curCreatedEvent.startTime,
      endTime: end_time
    });
  };

  const onCreateDragEnd = (day: string, start_time: number, end_time: number) => {
    if (!eventCreationEnabled || !creatingEvent) {
      return;
    }
    console.log("onMouseUpInterval " + day + " " + start_time + " " + end_time);
    onEventCreated(normalizeCreatedEvent());
    setCurCreatedEvent({ day: "", startTime: -1, endTime: -1 });
    setCreatingEvent(false);
  };

  const onCreateDragEndCancel = (e: MouseEvent | FocusEvent) => {
    console.log("canceled");
    console.log(e);
    setCurCreatedEvent({ day: "", startTime: -1, endTime: -1 });
    setCreatingEvent(false);
  };

  const normalizeCreatedEvent = () => {
    if (curCreatedEvent.startTime < curCreatedEvent.endTime) {
      return curCreatedEvent;
    } else {
      return {
        day: curCreatedEvent.day,
        startTime: curCreatedEvent.endTime - INTERVAL_LENGTH,
        endTime: curCreatedEvent.startTime + INTERVAL_LENGTH
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
              eventSelectIndex={selectedEventIdx}
              events={categorizedEvents[day] || []}
              curCreatedTimes={createdTimes}
              curCreatedTime={normalizeCreatedEvent()}
              intervalHeight={intervalHeight}
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
  disableHover: false
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
        {i % 60 == 0 ? formatMinutes(i) : ""}
      </div>
    );
  }

  return <div className="calendar-labels">{labels}</div>;
}
