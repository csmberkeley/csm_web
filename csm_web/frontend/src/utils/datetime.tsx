import { DateTime, DateTimeFormatOptions, IANAZone, Interval } from "luxon";

export const DEFAULT_TIMEZONE = IANAZone.create("America/Los_Angeles");

export const DEFAULT_LONG_LOCALE_OPTIONS: DateTimeFormatOptions = {
  weekday: "long",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: true,
  timeZoneName: "short"
};

export const DATETIME_INITIAL_INVALID = DateTime.invalid("initial value");
export const INTERVAL_INITIAL_INVALID = Interval.invalid("initial value");

/**
 * Format a date for display.
 *
 * @param datetime - datetime object to format
 * @returns formatted date
 */
export const formatDate = (datetime: DateTime): string => {
  return datetime.toLocaleString(DateTime.DATE_SHORT);
};

/**
 * Format datetime as "HH:MM AM/PM".
 *
 * If the minutes are 0, displays "HH AM/PM" if 12-hour.
 * 24-hour time display has no special handling.
 *
 * @param number representing the number of minutes past 12:00 AM
 */
export function formatTime(datetime: DateTime) {
  if (datetime.get("minute") == 0) {
    return datetime.toLocaleString({ hour: "numeric", hour12: true });
  } else {
    return datetime.toLocaleString({ ...DateTime.TIME_SIMPLE, hour12: true, hour: "numeric" });
  }
}

/**
 * Format an interval object.
 *
 * If the minutes for both endpoints are 0, then minutes are not displayed
 * (ex. 10 - 11 AM, instead of 10:00 - 11:00 AM).
 *
 */
export function formatInterval(interval: Interval): string {
  if (interval.start!.get("minute") != 0 || interval.end!.get("minute") != 0) {
    return interval.toLocaleString({ hour: "numeric", minute: "2-digit", hour12: true });
  } else {
    return interval.toLocaleString({ hour: "numeric", hour12: true });
  }
}
