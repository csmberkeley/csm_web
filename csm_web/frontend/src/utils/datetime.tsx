import { DateTime, DateTimeFormatOptions, Duration, IANAZone, Info, Interval } from "luxon";
import { Spacetime } from "./types";

export const DEFAULT_TIMEZONE = IANAZone.create("America/Los_Angeles");

export const DEFAULT_LONG_LOCALE_OPTIONS: DateTimeFormatOptions = {
  weekday: "long",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
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
    return datetime.toLocaleString({ hour: "numeric" });
  } else {
    return datetime.toLocaleString({ ...DateTime.TIME_SIMPLE, hour: "numeric" });
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
    return interval.toLocaleString({ hour: "numeric", minute: "2-digit" });
  } else {
    return interval.toLocaleString({ hour: "numeric" });
  }
}

/**
 * Create an interval from the day, time, and duration.
 *
 * The associated date is not relevant, and should be ignored.
 * (It's required for the interval to be created; by default,
 * the date used is the most recent past date that matches the parameters.
 * This should not be relied upon, however, and is merely an implementation detail.)
 *
 * @param day - ISO day of the week (Monday = 1, Tuesday = 2, etc.)
 * @param time - ISO time of day (no date)
 * @param duration - number in seconds for how long the interval lasts
 */
export function intervalFromDayAndTime(day: number, time: string, duration: number): Interval {
  const startDateTime = DateTime.fromISO(time, { zone: DEFAULT_TIMEZONE }).set({ weekday: day });
  const endDateTime = startDateTime.plus(Duration.fromObject({ seconds: duration }));

  return Interval.fromDateTimes(startDateTime, endDateTime);
}

/**
 * Format an interval for display as a section time.
 *
 * The default formatting used by .toLocaleString() is not desired,
 * since it includes information about the date.
 * Since section times are not tied to any dates, this needs to be manually modified
 * to only include the day of the week,
 */
export function formatSectionInterval(interval: Interval): string {
  const startTime = interval.start!;
  const endTime = interval.end!;

  // an interval crosses midnight if the days are different
  const crossesMidnight = startTime.get("day") !== endTime.get("day");

  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit"
  };

  if (crossesMidnight) {
    // custom formatting if the interval crosses midnight, as default shows the date
    const formattedStart = startTime.toLocaleString(defaultOptions);
    const formattedEnd = endTime.toLocaleString({ ...defaultOptions, timeZoneName: "short" });
    return `${formattedStart} \u2013 ${formattedEnd}`;
  } else {
    // default locale formatting is fine if the interval does not cross midnight
    return interval.toLocaleString({
      ...defaultOptions,
      timeZoneName: "short"
    });
  }
}

/**
 * Format a spacetime interval for display.
 */
export function formatSpacetimeInterval(spacetime: Spacetime): string {
  const interval = intervalFromDayAndTime(spacetime.dayOfWeek, spacetime.startTime, spacetime.duration);
  return formatSectionInterval(interval);
}

/**
 * Convert the day of the week as a number in ISO format
 * to a string in the user's current locale.
 */
export function dayOfWeekToLocaleString(dayOfWeek: number): string {
  return Info.weekdaysFormat("long")[dayOfWeek - 1];
}

export function dayOfWeekToEnglishString(dayOfWeek: number): string {
  return Info.weekdaysFormat("long", { locale: "en-us" })[dayOfWeek - 1];
}

/**
 * Map from weekday string to the ISO value for the weekday.
 */
export const DAYS_OF_WEEK = new Map(Info.weekdaysFormat("long").map((weekday, index) => [weekday, index + 1]));

/**
 * Convert an ISO datetime string into a string for use in a `datetime-local` input field.
 *
 * If an invalid date is passed in, the date will be returned unchanged.
 */
export function formatForDatetimeInput(datetimeStr: string): string {
  return (
    DateTime.fromISO(datetimeStr).toISO({
      includeOffset: false,
      suppressSeconds: true,
      suppressMilliseconds: true
    }) ?? datetimeStr // if invalid, return it unchanged
  );
}

/**
 * Convert a string taken from a `datetime-local` input field into a `DateTime` object,
 * with the timezone set to PST.
 *
 * If the input string is invalid, the resulting `DateTime` object will have an `isValid` flag set to false,
 * as per documentation on `DateTime.fromISO`.
 *
 * @see DateTime.fromISO
 */
export function parseDatetimeInput(datetimeStr: string): DateTime {
  return DateTime.fromISO(datetimeStr, {
    zone: DEFAULT_TIMEZONE
  });
}
