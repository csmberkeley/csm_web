import React from "react";
import { formatTime } from "../utils";
import { CalendarEventSingleTime } from "./CalendarTypes";

interface NumberTime {
  day: string;
  startTime: number;
  endTime: number;
}

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
  curCreatedTimes: NumberTime[];
  curCreatedTime: NumberTime;
  intervalHeight: number;
  onEventClick: (index: number) => void;
  onEventHover: (index: number) => void;
  onCreateDragStart: (day: string, startTime: number, endTime: number) => void;
  onCreateDragOver: (day: string, startTime: number, endTime: number) => void;
  onCreateDragEnd: (day: string, startTime: number, endTime: number) => void;
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
  curCreatedTimes,
  curCreatedTime,
  intervalHeight,
  onEventClick,
  onEventHover,
  onCreateDragStart,
  onCreateDragOver,
  onCreateDragEnd,
  getEventDetails
}: CalendarDayProps): React.ReactElement {
  // create array of intervals by intervalLength
  const intervals = [];
  for (let i = startTime; i < endTime; i += intervalLength) {
    intervals.push(
      <CalendarDayInterval
        key={i}
        day={day}
        startTime={i}
        endTime={i + intervalLength}
        onCreateDragStart={onCreateDragStart}
        onCreateDragOver={onCreateDragOver}
        onCreateDragEnd={onCreateDragEnd}
      />
    );
  }

  const eventElements = [];

  // enumerate events with index
  for (const { event_idx, event } of events) {
    const isHover = eventHoverIndex === event_idx;
    const isSelect = eventSelectIndex === event_idx;

    // TODO: handle cases where event crosses midnight
    const eventYOffset = (intervalHeight * (event.time.startTime - startTime)) / intervalLength;
    const eventHeight = (intervalHeight * (event.time.endTime - event.time.startTime)) / intervalLength;

    const curElement = (
      <div className="calendar-event-container" key={`${event.time.startTime}-${event.time.endTime}`}>
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

  let curCreatedEventElement = null;
  if (curCreatedTime.day === day) {
    const eventYOffset = (intervalHeight * (curCreatedTime.startTime - startTime)) / intervalLength;
    const eventHeight = (intervalHeight * (curCreatedTime.endTime - curCreatedTime.startTime)) / intervalLength;

    curCreatedEventElement = (
      <div className="calendar-transparent-event-container">
        <div
          className="calendar-transparent-event"
          style={{
            top: eventYOffset,
            height: eventHeight
          }}
        >
          <div className="calendar-event-detail">
            <div className="calendar-event-detail-title">
              {formatTime(curCreatedTime.startTime)}&#8211;{formatTime(curCreatedTime.endTime)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const curCreatedTimeElements = [];
  for (const time of curCreatedTimes) {
    if (time.day === day) {
      const eventYOffset = (intervalHeight * (time.startTime - startTime)) / intervalLength;
      const eventHeight = (intervalHeight * (time.endTime - time.startTime)) / intervalLength;

      const curElement = (
        <div className="calendar-event-container" key={`${time.startTime}-${time.endTime}`}>
          <div
            className="calendar-creating-event"
            style={{
              top: eventYOffset,
              height: eventHeight
            }}
          >
            <div className="calendar-event-detail">
              <div className="calendar-event-detail-title">
                {formatTime(time.startTime)}&#8211;{formatTime(time.endTime)}
              </div>
            </div>
          </div>
        </div>
      );
      curCreatedTimeElements.push(curElement);
    }
  }

  return (
    <div className="calendar-day-container">
      <div className="calendar-day">
        <div className="calendar-events">
          {curCreatedEventElement}
          {curCreatedTimeElements}
          {eventElements}
        </div>
        {intervals}
      </div>
    </div>
  );
}

interface CalendarDayHeaderProps {
  day: string;
}

export function CalendarDayHeader({ day }: CalendarDayHeaderProps): React.ReactElement {
  return <div className="calendar-day-header">{day.slice(0, 3)}</div>;
}

interface CalendarDayIntervalProps {
  day: string;
  startTime: number;
  endTime: number;
  onCreateDragStart: (day: string, startTime: number, endTime: number) => void;
  onCreateDragOver: (day: string, startTime: number, endTime: number) => void;
  onCreateDragEnd: (day: string, startTime: number, endTime: number) => void;
}

function CalendarDayInterval({
  day,
  startTime,
  endTime,
  onCreateDragStart,
  onCreateDragOver,
  onCreateDragEnd
}: CalendarDayIntervalProps): React.ReactElement {
  const dragStartWrapper = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons === 1) {
      e.preventDefault();
      onCreateDragStart(day, startTime, endTime);
    }
  };

  const dragOverWrapper = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons === 1) {
      e.preventDefault();
      onCreateDragOver(day, startTime, endTime);
    }
  };

  const dragEndWrapper = (e: React.MouseEvent<HTMLDivElement>) => {
    // stop event propagation to capture this as a true drag end
    e.preventDefault();
    e.stopPropagation();
    onCreateDragEnd(day, startTime, endTime);
  };

  return (
    <div
      className="calendar-day-interval"
      onMouseDown={dragStartWrapper}
      onMouseEnter={dragOverWrapper}
      onMouseUp={dragEndWrapper}
    ></div>
  );
}
