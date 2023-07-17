import { DateTime } from "luxon";

/**
 * Maximum preference for mentors
 */
export const MAX_PREFERENCE = 5;

/**
 * Serialize time into HH:MM format
 *
 * @param time number of minutes past midnight
 */
export function serializeTime(time: DateTime): string {
  return time.toFormat("HH:mm")!;
}

/**
 * Parses a 24h time string into a DateTime object
 *
 * @param time 24h time string
 * @returns datetime object
 */
export function parseTime(time: string): DateTime {
  return DateTime.fromFormat(time, "HH:mm");
}
