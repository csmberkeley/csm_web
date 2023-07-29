export interface Override {
  date: string;
  spacetime: Spacetime;
}

export interface Spacetime {
  dayOfWeek: string;
  duration: string;
  id: number;
  location?: string;
  startTime: string;
  time: string;
  override?: Override;
}

export interface Profile {
  id: number;
  course: string;
  courseTitle: string;
  role: string;
  sectionId: number;
  courseId: number;
  sectionSpacetimes: Array<Spacetime>;
}

export interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  priorityEnrollment?: Date;
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
  userRole: string;
  courseTitle: string;
  courseRestricted: boolean;
  numStudentsWaitlisted: number;
  waitlistCapacity: number;
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
