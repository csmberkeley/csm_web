import { DateTime } from "luxon";

export enum Role {
  COORDINATOR = "COORDINATOR",
  MENTOR = "MENTOR",
  STUDENT = "STUDENT"
}

export interface Override {
  date: string;
  spacetime: Spacetime;
}

export interface Spacetime {
  dayOfWeek: number;
  duration: number;
  id: number;
  location?: string;
  startTime: string;
  override?: Override;
}

export interface Profile {
  id: number;
  course: string;
  courseTitle: string;
  role: Role;
  sectionId: number;
  courseId: number;
  sectionSpacetimes: Array<Spacetime>;
}

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  priorityEnrollment?: DateTime;
}

/**
 * Raw type from the query response.
 */
export type RawUserInfo = Omit<UserInfo, "priorityEnrollment"> & {
  priorityEnrollment?: string;
};

export interface Section {
  id: number;
  spacetimes: Spacetime[];
  mentor: Mentor;
  capacity: number;
  associatedProfileId: number;
  numStudentsEnrolled: number;
  description: string;
  course: string;
  userRole: Role;
  courseTitle: string;
  courseRestricted: boolean;
}

export interface Mentor {
  id: number;
  name: string;
  email: string;
  section: number;
}

export interface Course {
  id: number;
  name: string;
  enrollmentStart: string;
  enrollmentOpen: boolean;
  userCanEnroll: boolean;
  isRestricted: boolean;
  wordOfTheDayLimit: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
}

export enum AttendancePresence {
  EX = "EX",
  PR = "PR",
  UN = "UN"
}

export interface Attendance {
  id: number;
  date: string;
  student: Student;
  presence: AttendancePresence;
  occurrenceId: number;
  wordOfTheDayDeadline: string;
}

export interface RawAttendance {
  id: number;
  date: string;
  section: Section;
  attendances: Array<{
    id: number;
    date: string;
    presence: AttendancePresence;
    studentName: string;
    studentId: number;
    studentEmail: string;
    wordOfTheDayDeadline: string;
  }>;
}
