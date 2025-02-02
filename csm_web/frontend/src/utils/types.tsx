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

export interface ChangeableUserInfo {
  preferredName: string;
  bio: string;
  pronouns: string;
  pronunciation: string;
}

export interface UserInfo extends ChangeableUserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  priorityEnrollment?: DateTime;
  isEditable: boolean;
  profileImage?: string;
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
  user: RawUserInfo;
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
  user: RawUserInfo;
}

export interface Attendance {
  id: number;
  date: string;
  student: Student;
  presence: string;
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
    presence: string;
    studentName: string;
    studentId: number;
    studentEmail: string;
    wordOfTheDayDeadline: string;
  }>;
}
