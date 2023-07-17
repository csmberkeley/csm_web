import { DateTime } from "luxon";

export const MONTH_NUMBERS: Readonly<{ [month: string]: number }> = Object.freeze({
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12
});

export const DAYS_OF_WEEK: Readonly<string[]> = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]);

/**
 * Convert date from ISO to mm/dd/yy.
 *
 * Example:
 * formatDate("2022-01-06") --> "1/6/22"
 */
export function formatDateLocaleShort(dateString: string): string {
  return DateTime.fromISO(dateString).toLocaleString({
    ...DateTime.DATE_SHORT,
    // use 2-digit year
    year: "2-digit"
  });
}

/**
 * Convert date from ISO to "Month day, year"
 *
 * Example:
 * formatDate("2022-01-06") --> "Jan 6, 2022"
 */
export function formatDateAbbrevWord(dateString: string): string {
  return DateTime.fromISO(dateString).toLocaleString(DateTime.DATE_MED);
}

/**
 * Sort two dates in ISO.
 */
export function dateSortISO(date1: string, date2: string) {
  return DateTime.fromISO(date2).diff(DateTime.fromISO(date1)).as("milliseconds");
}

export function zeroPadTwoDigit(num: number) {
  return num < 10 ? `0${num}` : num;
}
