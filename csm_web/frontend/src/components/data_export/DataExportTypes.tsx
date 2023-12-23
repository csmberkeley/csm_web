/**
 * Enum for all the various data export types
 */
export enum ExportType {
  STUDENT_DATA = "STUDENT_DATA",
  ATTENDANCE_DATA = "ATTENDANCE_DATA",
  SECTION_DATA = "SECTION_DATA",
  COURSE_DATA = "COURSE_DATA"
}

/**
 * Object for displaying export types in the UI
 */
export const EXPORT_TYPE_DATA = new Map<ExportType, string>([
  [ExportType.STUDENT_DATA, "Student data"],
  [ExportType.ATTENDANCE_DATA, "Attendance data"],
  [ExportType.SECTION_DATA, "Section data"],
  [ExportType.COURSE_DATA, "Course data"]
]);

export const EXPORT_COLUMNS: {
  [exportType in ExportType]: {
    required: { [key: string]: string };
    optional: { [key: string]: string };
  };
} = {
  [ExportType.ATTENDANCE_DATA]: {
    required: {
      student_email: "Student email",
      student_name: "Student name"
    },
    optional: {
      course_name: "Course name",
      active: "Active",
      section_id: "Section ID",
      mentor_name: "Mentor name",
      mentor_email: "Mentor email"
    }
  },
  [ExportType.COURSE_DATA]: {
    required: {
      course_name: "Course name"
    },
    optional: {
      course_id: "Course ID",
      description: "Course description",
      num_sections: "Section count",
      num_students: "Student count",
      num_mentors: "Mentor count"
    }
  },
  [ExportType.SECTION_DATA]: {
    required: {
      mentor_name: "Mentor name",
      mentor_email: "Mentor email"
    },
    optional: {
      course_name: "Course name",
      section_id: "Section ID",
      section_times: "Section times",
      section_description: "Section description",
      num_students: "Student count",
      capacity: "Capacity"
    }
  },
  [ExportType.STUDENT_DATA]: {
    required: {
      student_email: "Student email",
      student_name: "Student name"
    },
    optional: {
      course_name: "Course name",
      active: "Active",
      mentor_name: "Mentor name",
      mentor_email: "Mentor email",
      section_id: "Section ID",
      section_times: "Section times",
      num_present: "Present attendance count",
      num_excused: "Excused absence count",
      num_unexcused: "Unexcused absence count"
    }
  }
};
