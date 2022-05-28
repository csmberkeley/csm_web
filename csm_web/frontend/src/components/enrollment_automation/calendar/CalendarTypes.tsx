import { Time } from "../EnrollmentAutomationTypes";

export const DAYS: readonly string[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DAYS_ABBREV: Record<typeof DAYS[number], string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri"
};

export interface CalendarEvent {
  times: Time[];
  // other arbitrary attributes
  [key: string]: any;
}

export interface CalendarEventSingleTime {
  time: Time;
  // other arbitrary attributes
  [key: string]: any;
}
