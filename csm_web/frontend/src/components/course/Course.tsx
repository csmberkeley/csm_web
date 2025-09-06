import { DateTime } from "luxon";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { DEFAULT_LONG_LOCALE_OPTIONS } from "../../utils/datetime";
import { useCourseSections } from "../../utils/queries/courses";
import { Course as CourseType } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import CourseBios from "./CourseBios";
import CourseSections from "./CourseSections";

import "../../css/course.scss";

export const DAY_OF_WEEK_ABREVIATIONS: { [day: string]: string } = Object.freeze({
  Monday: "M",
  Tuesday: "Tu",
  Wednesday: "W",
  Thursday: "Th",
  Friday: "F",
  Saturday: "Sa",
  Sunday: "Su"
});

export interface CourseProps {
  /*
   * `courses` will be null if it hasn't yet been loaded (the relevant request to the API is performed in CourseMenu)
   * We structure things like this in order to avoid a 'waterfall' where we don't start fetching sections until
   * CourseMenu is done with its API requests, making the user suffer twice the latency for no reason.
   */
  courses: Map<number, CourseType> | null;
  enrollmentTimes: Array<{ courseName: string; enrollmentDate: DateTime }>;
  priorityEnrollment: DateTime | undefined;
}

const Course = ({ courses, priorityEnrollment, enrollmentTimes }: CourseProps) => {
  /**
   * Course id from the URL.
   */
  const { courseId } = useParams();

  /**
   * Sections grouped by day of the week, and whether the user is a coordinator.
   */
  const {
    data: jsonSections,
    isSuccess: sectionsLoaded,
    isError: sectionsLoadError,
    refetch: reloadSections
  } = useCourseSections(courseId ? parseInt(courseId) : undefined);

  const [display, setDisplay] = useState<"sections" | "bios">("sections");

  if (courses === null) {
    // if courses not loaded, parent component deals with loading spinner
    return null;
  } else if (!courses.has(parseInt(courseId!)) || sectionsLoadError) {
    return <h3>Course not found</h3>;
  } else if (!sectionsLoaded) {
    return <LoadingSpinner className="spinner-centered" />;
  }

  const { sectionsByDay, userIsCoordinator } = jsonSections;

  /**
   * Course object from the courses map, retrieved from the course id.
   * Checked prior, so this should always exist.
   */
  const course = courses.get(parseInt(courseId!))!;

  const enrollmentDate =
    priorityEnrollment ?? enrollmentTimes.find(({ courseName }) => courseName == course.name)?.enrollmentDate;
  const enrollmentTimeString = enrollmentDate?.toLocaleString(DEFAULT_LONG_LOCALE_OPTIONS) ?? "";
  const hasPriorityEnrollment = priorityEnrollment != null;

  return (
    <div id="course-section-selector">
      <div id="course-header">
        <h2 className="course-title">{course.name}</h2>
        <button className="primary-outline-btn" onClick={() => setDisplay(display == "sections" ? "bios" : "sections")}>
          View {display == "sections" ? "Bios" : "Sections"}
        </button>
      </div>
      {display == "sections" ? (
        <CourseSections
          course={course}
          sectionsByDay={sectionsByDay}
          enrollmentTimeString={enrollmentTimeString}
          userIsCoordinator={userIsCoordinator}
          hasPriorityEnrollment={hasPriorityEnrollment}
          reloadSections={reloadSections}
        />
      ) : (
        <CourseBios sectionsByDay={sectionsByDay} />
      )}
    </div>
  );
};
export default Course;
