import React, { useEffect, useState } from "react";
import { formatInterval } from "../utils";
import { CalendarEventSingleTime } from "./CalendarTypes";

const NO_CONTENT_WIDTH = 35;

interface NumberTime {
  day: string;
  startTime: number;
  endTime: number;
  isLinked: boolean;
}

enum EventType {
  SAVED,
  CREATED,
  EDITING
}

/**
 * Interface to house attributes after computation of overlapping events.
 */
interface ComputedTime {
  // for display purposes, the kind of event this is
  eventType: EventType;

  // day/start/end attributes from the event
  day: string;
  startTime: number;
  endTime: number;

  // associated event index and event
  event_idx?: number;
  event?: CalendarEventSingleTime;

  isLinked: boolean;

  track: number; // column within the interval for display
  totalTracks: number; // total number of columns in the current interval
}

interface CalendarDayProps {
  day: string;
  startTime: number;
  endTime: number;
  intervalLength: number;
  eventHoverIndex: number;
  eventSelectIndices: number[];
  events: {
    event_idx: number;
    event: CalendarEventSingleTime;
    isLinked: boolean;
  }[];
  curCreatedTimes: NumberTime[];
  curCreatedTime: NumberTime;
  intervalHeight: number;
  intervalWidth: number;
  onEventClick: (index: number, add: boolean) => void;
  onEventHover: (index: number) => void;
  onCreateDragStart: (day: string, startTime: number, endTime: number) => void;
  onCreateDragOver: (day: string, startTime: number, endTime: number) => void;
  onCreateDragEnd: (day: string, startTime: number, endTime: number) => void;
  getEventDetails: (event: CalendarEventSingleTime) => React.ReactElement;
  brighterLinkedTimes: boolean;
  flushDetails: boolean;
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
  eventSelectIndices: eventSelectIndex,
  events,
  curCreatedTimes,
  curCreatedTime,
  intervalHeight,
  intervalWidth,
  onEventClick,
  onEventHover,
  onCreateDragStart,
  onCreateDragOver,
  onCreateDragEnd,
  getEventDetails,
  brighterLinkedTimes,
  flushDetails
}: CalendarDayProps): React.ReactElement {
  const [computedTimes, setComputedTimes] = useState<ComputedTime[]>([]);
  const [computedTimesWithLocations, setComputedTimesWithLocations] = useState<ComputedTime[]>([]);

  // transform events into a list of computed times
  useEffect(() => {
    const filteredCurCreatedTimes = curCreatedTimes.filter(time => time.day === day);
    setComputedTimes(
      events
        .map(
          ({ event_idx, event, isLinked }): ComputedTime => ({
            eventType: EventType.SAVED,
            day: event.time.day,
            startTime: event.time.startTime,
            endTime: event.time.endTime,
            event_idx,
            event,
            isLinked,
            track: -1,
            totalTracks: -1
          })
        )
        .concat(
          // add created times to the list of computed times
          filteredCurCreatedTimes.map((time, idx) => ({
            eventType: EventType.CREATED,
            day: time.day,
            startTime: time.startTime,
            endTime: time.endTime,
            event_idx: idx,
            isLinked: time.isLinked,
            track: -1,
            totalTracks: -1
          })),
          // add current created time to the list of computed times
          curCreatedTime.day === day
            ? [
                {
                  eventType: EventType.EDITING,
                  day: day,
                  startTime: curCreatedTime.startTime,
                  endTime: curCreatedTime.endTime,
                  isLinked: curCreatedTime.isLinked,
                  track: -1,
                  totalTracks: -1
                }
              ]
            : []
        )
    );
  }, [events, curCreatedTimes, curCreatedTime, day]);

  // arrange the events and compute their locations
  useEffect(() => {
    setComputedTimesWithLocations(computeLocations(computedTimes));
  }, [computedTimes]);

  const eventElements = [];

  const getEventPosition = (computedTime: ComputedTime) => {
    const eventYOffset = (intervalHeight * (computedTime.startTime - startTime)) / intervalLength;
    const eventHeight = (intervalHeight * (computedTime.endTime - computedTime.startTime)) / intervalLength;
    const eventWidth = intervalWidth / computedTime.totalTracks;
    const eventXOffset = eventWidth * computedTime.track;

    return {
      style: {
        top: eventYOffset,
        left: eventXOffset,
        width: eventWidth,
        height: eventHeight
      },
      showContent: eventWidth > NO_CONTENT_WIDTH
    };
  };

  const getSavedEventHTML = (computedTime: ComputedTime) => {
    const event_idx = computedTime.event_idx!;
    const event = computedTime.event!;

    const isHover = eventHoverIndex === event_idx;
    const isSelect = eventSelectIndex.includes(event_idx);
    const isLinked = computedTime.isLinked;

    const handleEventClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const shiftPressed: boolean = e.shiftKey;
      onEventClick(event_idx, shiftPressed);
    };

    const eventPosition = getEventPosition(computedTime);

    const classList = ["calendar-event"];
    if (isHover) {
      classList.push("calendar-event-hover");
    }
    if (isSelect) {
      classList.push("calendar-event-select");
    }
    if (brighterLinkedTimes && isLinked) {
      classList.push("calendar-event-linked");
    }

    return (
      <div
        className="calendar-event-container"
        key={`${event.time.startTime}-${event.time.endTime}-${computedTime.track}`}
      >
        <div className={classList.join(" ")} style={eventPosition.style}>
          <div
            className={`calendar-event-detail ${flushDetails ? "flush" : ""}`}
            onClick={handleEventClick}
            onMouseEnter={() => onEventHover(event_idx)}
            onMouseLeave={() => onEventHover(-1)}
          >
            {eventPosition.showContent ? getEventDetails(event) : "..."}
          </div>
        </div>
      </div>
    );
  };

  const getCreatedEventHTML = (computedTime: ComputedTime) => {
    const eventPosition = getEventPosition(computedTime);
    return (
      <div
        className="calendar-event-container"
        key={`${computedTime.startTime}-${computedTime.endTime}-${computedTime.track}`}
      >
        <div
          className={`calendar-creating-event ${
            brighterLinkedTimes && computedTime.isLinked ? "calendar-event-linked" : ""
          }`}
          style={eventPosition.style}
        >
          <div className={`calendar-event-detail ${flushDetails ? "flush" : ""}`}>
            <div className="calendar-event-detail-title">
              {eventPosition.showContent ? formatInterval(computedTime.startTime, computedTime.endTime) : "..."}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getEditingEventHTML = (computedTime: ComputedTime) => {
    const eventPosition = getEventPosition(computedTime);
    return (
      <div
        className="calendar-transparent-event-container"
        key={`${computedTime.startTime}-${computedTime.endTime}-${computedTime.track}`}
      >
        <div
          className={`calendar-transparent-event ${
            brighterLinkedTimes && computedTime.isLinked ? "calendar-event-linked" : ""
          }`}
          style={eventPosition.style}
        >
          <div className={`calendar-event-detail ${flushDetails ? "flush" : ""}`}>
            <div className="calendar-event-detail-title">
              {eventPosition.showContent ? formatInterval(computedTime.startTime, computedTime.endTime) : "..."}
            </div>
          </div>
        </div>
      </div>
    );
  };

  for (const computedTime of computedTimesWithLocations) {
    if (computedTime.eventType === EventType.SAVED) {
      eventElements.push(getSavedEventHTML(computedTime));
    } else if (computedTime.eventType === EventType.CREATED) {
      eventElements.push(getCreatedEventHTML(computedTime));
    } else if (computedTime.eventType === EventType.EDITING) {
      eventElements.push(getEditingEventHTML(computedTime));
    }
  }

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

enum MarkerType {
  START = "START",
  END = "END"
}

interface ComputeLocationsMarker {
  markerType: MarkerType;
  time: number;
  computedTime: ComputedTime;
  // shared state between start and end markers
  state: {
    track?: number;
  };
}

const computeLocations = (computedTimes: ComputedTime[]): ComputedTime[] => {
  const markers: ComputeLocationsMarker[] = [];
  computedTimes.forEach(computedTime => {
    const sharedState = {};
    markers.push({
      markerType: MarkerType.START,
      time: computedTime.startTime,
      computedTime,
      state: sharedState
    });
    markers.push({
      markerType: MarkerType.END,
      time: computedTime.endTime,
      computedTime,
      state: sharedState
    });
  });

  markers.sort((a, b) => {
    // sort by time first
    if (a.time != b.time) {
      return a.time - b.time;
    }
    // then by marker type; put END before START
    if (a.markerType == MarkerType.END && b.markerType == MarkerType.START) {
      return -1;
    } else if (a.markerType == MarkerType.START && b.markerType == MarkerType.END) {
      return 1;
    }
    // otherwise they're equal
    return 0;
  });

  let finalEvents: ComputedTime[] = [];

  let overlapping = 0;
  const usedTracks = new Set<number>();
  while (markers.length > 0) {
    const interval: ComputedTime[] = [];
    let maxOverlap = 0;
    while (markers.length > 0) {
      const curMarker = markers.shift()!;
      if (curMarker.markerType == MarkerType.START) {
        let curTrack = -1;
        for (let track = 0; track <= overlapping; track++) {
          if (!usedTracks.has(track)) {
            curTrack = track;
            break;
          }
        }
        curMarker.state.track = curTrack;
        interval.push({ ...curMarker.computedTime, track: curTrack });
        usedTracks.add(curTrack);
        overlapping++;
        maxOverlap = Math.max(maxOverlap, overlapping);
      } else {
        overlapping--;
        usedTracks.delete(curMarker.state.track!);
      }

      if (overlapping == 0) {
        break;
      }
    }

    // iterate through the interval and update total tracks
    for (const curEvent of interval) {
      curEvent.totalTracks = maxOverlap;
    }

    finalEvents = finalEvents.concat(interval);
  }

  return finalEvents;
};