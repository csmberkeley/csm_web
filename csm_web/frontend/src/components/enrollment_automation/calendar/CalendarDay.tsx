import React from "react";
import { CalendarEventSingleTime } from "./Calendar";

interface CalendarDayProps {
  day: string;
  startTime: number;
  endTime: number;
  intervalLength: number;
  eventHoverIndex: number;
  eventSelectIndex: number;
  events: {
    event_idx: number;
    event: CalendarEventSingleTime;
  }[];
  intervalHeight: number;
  onEventClick: (index: number) => void;
  onEventHover: (index: number) => void;
  getEventDetails: (event: CalendarEventSingleTime) => React.ReactElement;
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

export function CalendarDay({
  day,
  startTime,
  endTime,
  intervalLength,
  eventHoverIndex,
  eventSelectIndex,
  events,
  intervalHeight,
  onEventClick,
  onEventHover,
  getEventDetails
}: CalendarDayProps): React.ReactElement {
  // create array of intervals by intervalLength
  const intervals = [];
  for (let i = startTime; i < endTime; i += intervalLength) {
    intervals.push(<CalendarDayInterval key={i} startTime={i} endTime={i + intervalLength} />);
  }

  const eventElements = [];

  // enumerate events with index
  for (const { event_idx, event } of events) {
    const isHover = eventHoverIndex === event_idx;
    const isSelect = eventSelectIndex === event_idx;

    // TODO: handle cases where event crosses midnight
    const eventStartMinutes = parseTime(event.time.start_time);
    const eventEndMinutes = parseTime(event.time.end_time);

    const eventYOffset = (intervalHeight * (eventStartMinutes - startTime)) / intervalLength;
    const eventHeight = (intervalHeight * (eventEndMinutes - eventStartMinutes)) / intervalLength;

    const curElement = (
      <div className="calendar-event-container" key={`${event.time.start_time}-${event.time.end_time}`}>
        <div
          className={`calendar-event ${isHover ? "calendar-event-hover" : ""} ${
            isSelect ? "calendar-event-select" : ""
          }`}
          style={{
            top: eventYOffset,
            height: eventHeight
          }}
        >
          <div
            className="calendar-event-detail"
            onClick={() => onEventClick(event_idx)}
            onMouseEnter={() => onEventHover(event_idx)}
            onMouseLeave={() => onEventHover(-1)}
          >
            {getEventDetails(event)}
          </div>
        </div>
      </div>
    );
    eventElements.push(curElement);
  }

  return (
    <div className="calendar-day-container">
      <div className="calendar-day">
        <div className="calendar-events">{eventElements}</div>
        {intervals}
      </div>
    </div>
  );
}

interface CalendarDayHeaderProps {
  day: string;
}

export function CalendarDayHeader({ day }: CalendarDayHeaderProps): React.ReactElement {
  return <div className="calendar-day-header">{day}</div>;
}

interface CalendarDayIntervalProps {
  startTime: number;
  endTime: number;
}

function CalendarDayInterval({ startTime, endTime }: CalendarDayIntervalProps): React.ReactElement {
  return <div className="calendar-day-interval"></div>;
}
