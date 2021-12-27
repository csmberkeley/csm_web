import React, { useEffect, useState } from "react";
import { CalendarDay, CalendarDayHeader } from "./CalendarDay";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// default start and end times for calendar
const START = 8 * 60 + 0; // 8:00 AM
const END = 18 * 60 + 0; // 6:00 PM
const INTERVAL_LENGTH = 30;

/**
 * Format time as HH:MM AM/PM
 * @param mins number of minutes past midnight
 */
function formatMinutes(mins: number): string {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  if (minutes == 0) {
    return `${hours > 12 ? hours % 12 : hours} ${ampm}`;
  }
  return `${hours > 12 ? hours % 12 : hours}:${minutes < 10 ? "0" : ""}${minutes} ${ampm}`;
}

/**
 * Parses a 24h time string and returns the number of minutes past midnight.
 * @param time 24h time string
 * @returns minutes past midnight
 */
function parseTime(time: string): number {
  const [hours, minutes] = time.split(":");
  return parseInt(hours) * 60 + parseInt(minutes);
}

export interface CalendarEvent {
  times: { day: string; start_time: string; end_time: string }[];
  [key: string]: any;
}

export interface CalendarEventSingleTime {
  time: { day: string; start_time: string; end_time: string };
  [key: string]: any;
}

interface CalendarProps {
  events: CalendarEvent[];
  onEventClick: (event_idx: number) => void;
  getEventDetails: (event: CalendarEventSingleTime) => React.ReactElement;
}

export function Calendar({ events, onEventClick, getEventDetails }: CalendarProps): React.ReactElement {
  const [intervalHeight, setIntervalHeight] = useState(0);
  const [eventHoverIndex, setEventHoverIndex] = useState(-1);
  const [eventSelectIndex, setEventSelectIndex] = useState(-1);

  useEffect(() => {
    const interval = document.getElementsByClassName("calendar-day-interval").item(0);
    setIntervalHeight(interval!.getBoundingClientRect().height);

    // let timeoutId: any = null;
    // const resizeListener = () => {
    //   clearTimeout(timeoutId);

    //   // debounce resize
    //   timeoutId = setTimeout(() => {
    //     const interval = document.getElementsByClassName("calendar-day-interval").item(0);
    //     setIntervalHeight(interval!.getBoundingClientRect().height);
    //   }, 50);
    // };

    // // call once on mount
    // resizeListener();

    // // call on resize
    // window.addEventListener("resize", resizeListener);

    // // clean up on unmount
    // return () => {
    //   window.removeEventListener("resize", resizeListener);
    // };
  }, []);

  const categorizedEvents: { [day: string]: any } = {};

  let min_calendar_time = Infinity;
  let max_calendar_time = -Infinity;

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

      min_calendar_time = Math.min(min_calendar_time, parseTime(time.start_time));
      max_calendar_time = Math.max(max_calendar_time, parseTime(time.end_time));
    }
  }

  if (max_calendar_time - min_calendar_time < END - START) {
    min_calendar_time = Math.min(min_calendar_time, START);
    max_calendar_time = Math.max(max_calendar_time, END);
  }

  const eventClickWrapper = (index: number) => {
    setEventSelectIndex(index);
    onEventClick(index);
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
        <div className="calendar-body">
          <CalendarLabels startTime={min_calendar_time} endTime={max_calendar_time} intervalLength={INTERVAL_LENGTH} />
          {DAYS.map((day, idx) => (
            <CalendarDay
              key={idx}
              day={day}
              startTime={min_calendar_time}
              endTime={max_calendar_time}
              intervalLength={INTERVAL_LENGTH}
              eventHoverIndex={eventHoverIndex}
              eventSelectIndex={eventSelectIndex}
              events={categorizedEvents[day] || []}
              intervalHeight={intervalHeight}
              onEventHover={setEventHoverIndex}
              onEventClick={eventClickWrapper}
              getEventDetails={getEventDetails}
            ></CalendarDay>
          ))}
        </div>
      </div>
    </div>
  );
}
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
