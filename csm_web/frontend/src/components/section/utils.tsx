export const MONTH_NUMBERS = Object.freeze({
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

export const DAYS_OF_WEEK = Object.freeze([
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
]);

export function formatDate(dateString) {
  /*
   * Example:
   * formatDate("Jan. 6, 2020") --> "1/6"
   */
  const [month, dayAndYear] = dateString.split(".");
  const day = dayAndYear.split(",")[0].trim();
  return `${MONTH_NUMBERS[month]}/${day}`;
}

export function dateSort(date1, date2) {
  const [month1, day1] = formatDate(date1)
    .split("/")
    .map(part => Number(part));
  const [month2, day2] = formatDate(date2)
    .split("/")
    .map(part => Number(part));
  return month2 - month1 || day2 - day1;
}

export function zeroPadTwoDigit(num) {
  return num < 10 ? `0${num}` : num;
}
