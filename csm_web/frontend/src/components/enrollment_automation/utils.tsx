import React from "react";

/**
 * Maximum preference for mentors
 */
export const MAX_PREFERENCE = 5;

/**
 * Convert 24hr time to 12hr time
 *
 * @param time string in format "HH:MM"
 */
export function formatTime(time: number, show_ampm = true): string {
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  let ampm;
  if (show_ampm) {
    ampm = hours >= 12 ? "pm" : "am";
  } else {
    ampm = "";
  }
  if (minutes == 0) {
    return `${hours > 12 ? hours % 12 : hours === 0 ? 12 : hours}${ampm}`;
  }
  return `${hours > 12 ? hours % 12 : hours === 0 ? 12 : hours}:${minutes}${ampm}`;
}

export function formatInterval(start: number, end: number) {
  const startHours = Math.floor(start / 60);
  const endHours = Math.floor(end / 60);
  if ((startHours >= 12 && endHours < 12) || (startHours < 12 && endHours >= 12)) {
    return (
      <React.Fragment>
        {formatTime(start)} &ndash; {formatTime(end)}
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        {formatTime(start, false)} &ndash; {formatTime(end)}
      </React.Fragment>
    );
  }
}

/**
 * Serialize time into HH:MM format
 *
 * @param time number of minutes past midnight
 */
export function serializeTime(time: number): string {
  const hours = Math.floor(time / 60);
  const minutes = time % 60;
  return `${hours < 10 ? "0" : ""}${hours}:${minutes < 10 ? "0" : ""}${minutes}`;
}

/**
 * Parses a 24h time string and returns the number of minutes past midnight.
 * @param time 24h time string
 * @returns minutes past midnight
 */
export function parseTime(time: string): number {
  const [hours, minutes] = time.split(":");
  return parseInt(hours) * 60 + parseInt(minutes);
}
