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
 * Convert date of form yyyy-mm-dd to mm/dd.
 *
 * Example:
 * formatDate("2022-01-06") --> "1/6"
 */
export function formatDateISO(dateString: string): string {
  const [, /* ignore year */ month, day] = dateString.split("-").map(part => parseInt(part));
  return `${month}/${day}`;
}

/**
 * Convert date of form Month. day, year to mm/dd.
 *
 * Example:
 * formatDate("Jan. 6, 2022") --> "1/6"
 */
export function formatDateWord(dateString: string): string {
  const [month, dayAndYear] = dateString.split(".");
  const day = dayAndYear.split(",")[0].trim();
  return `${MONTH_NUMBERS[month]}/${day}`;
}

/**
 * Convert date of form yyyy-mm-dd to MOnth. day, year
 *
 * Example:
 * formatDate("2022-01-06") --> "Jan. 6, 2022"
 */
export function formatDateISOToWord(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(part => parseInt(part));

  // get word version of month
  for (const [monthWord, monthNumber] of Object.entries(MONTH_NUMBERS)) {
    if (monthNumber === month) {
      // format with word
      return `${monthWord}. ${day}, ${year}`;
    }
  }
  return "";
}

/**
 * Conert date of form Month. day, year into mm/dd/yyyy.
 *
 * Example:
 * formatDateYear("Jan. 6, 2022") --> 1/6/2022
 */
function formatDateYear(dateString: string): string {
  const year = dateString.split(",")[1];
  const formattedDate = formatDateWord(dateString);
  return `${formattedDate}/${year.trim()}`;
}

/**
 * Sort two dates of the form yyyy-mm-dd.
 */
export function dateSortISO(date1: string, date2: string) {
  const [year1, month1, day1] = date1.split("-").map(part => parseInt(part));
  const [year2, month2, day2] = date2.split("-").map(part => parseInt(part));
  return year2 - year1 || month2 - month1 || day2 - day1;
}

/**
 * Sort two dates of the form Month. day, year.
 *
 * Example: sorting dates like Jan. 6, 2022
 */
export function dateSortWord(date1: string, date2: string) {
  const [month1, day1, year1] = formatDateYear(date1)
    .split("/")
    .map(part => Number(part));
  const [month2, day2, year2] = formatDateYear(date2)
    .split("/")
    .map(part => Number(part));
  return year2 - year1 || month2 - month1 || day2 - day1;
}

export function zeroPadTwoDigit(num: number) {
  return num < 10 ? `0${num}` : num;
}
