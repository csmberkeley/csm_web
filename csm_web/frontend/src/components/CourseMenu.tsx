import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { useCourses } from "../utils/queries/courses";
import { useUserInfo } from "../utils/queries/base";
import { Course as CourseType, UserInfo } from "../utils/types";
import Course from "./course/Course";
import LoadingSpinner from "./LoadingSpinner";

const CourseMenu = () => {
  const { data: jsonCourses, isSuccess: coursesLoaded } = useCourses();
  const { data: jsonUserInfo, isSuccess: userInfoLoaded } = useUserInfo();

  /**
   * Transform JSON courses into a map of course IDs to course objects.
   */
  let courses: Map<number, CourseType> | null;
  if (coursesLoaded) {
    // We use a Map here instead of an object because we want the entries() iterator to reflect the order of insertion,
    // which in turn reflects the sorting order returned by the backend
    const coursesById = new Map<number, CourseType>();
    for (const course of jsonCourses) {
      coursesById.set(course.id, course);
    }
    courses = coursesById;
  } else {
    courses = null;
  }

  /**
   * Transform JSON user info into a user info object.
   */
  let userInfo: UserInfo | null;
  if (userInfoLoaded) {
    let priorityEnrollment = undefined;
    if (jsonUserInfo.priorityEnrollment) {
      priorityEnrollment = new Date(Date.parse(jsonUserInfo.priorityEnrollment));
    }
    const convertedUserInfo: UserInfo = {
      ...jsonUserInfo,
      priorityEnrollment
    };
    userInfo = convertedUserInfo;
  } else {
    // not done loading yet
    userInfo = null;
  }

  let show_enrollment_times = false;
  const enrollment_times_by_course: Array<{ courseName: string; enrollmentDate: Date }> = [];

  if (courses !== null) {
    for (const course of courses.values()) {
      show_enrollment_times ||= !course.enrollmentOpen;
      if (!course.enrollmentOpen) {
        enrollment_times_by_course.push({
          courseName: course.name,
          enrollmentDate: new Date(Date.parse(course.enrollmentStart))
        });
      }
    }
  }

  return (
    <Routes>
      <Route
        path=":courseId/*"
        element={
          userInfoLoaded ? (
            <Course
              courses={courses}
              priorityEnrollment={userInfo?.priorityEnrollment}
              enrollmentTimes={enrollment_times_by_course}
            />
          ) : (
            // loading courses; don't render course component yet
            <LoadingSpinner className="spinner-centered" />
          )
        }
      />
      <Route
        index
        element={
          <React.Fragment>
            <EnrollmentMenu courses={courses} />
            <br />
            <EnrollmentTimes
              coursesLoaded={coursesLoaded}
              userInfo={userInfo}
              enrollmentTimes={enrollment_times_by_course}
            />
          </React.Fragment>
        }
      />
    </Routes>
  );
};
export default CourseMenu;

interface EnrollmentMenuProps {
  courses: Map<number, CourseType> | null;
}

/**
 * Displays the list of courses.
 *
 * If courses have not been loaded, this component will display a loading spinner.
 */
const EnrollmentMenu = ({ courses }: EnrollmentMenuProps) => {
  return (
    <React.Fragment>
      <h3 className="page-title center-title">Which course would you like to enroll in?</h3>
      {courses !== null ? (
        <div id="course-menu">
          {Array.from(courses.entries()).map(([id, course]) => (
            <Link className="csm-btn" to={`${id}`} key={id}>
              {course.name}
            </Link>
          ))}
        </div>
      ) : (
        <LoadingSpinner id="course-menu-loading-spinner" />
      )}
    </React.Fragment>
  );
};

interface EnrollmentTimesProps {
  coursesLoaded: boolean;
  userInfo: UserInfo | null;
  enrollmentTimes: Array<{ courseName: string; enrollmentDate: Date }>;
}

/**
 * Displays the enrollment times for each course.
 *
 * If courses have not been loaded, EnrollmentMenu displays loading spinner,
 * so this component only needs to display the loading spinner when
 * the userInfo is loading.
 */
const EnrollmentTimes = ({
  enrollmentTimes,
  coursesLoaded,
  userInfo
}: EnrollmentTimesProps): React.ReactElement | null => {
  if (!coursesLoaded) {
    // if courses are still being loaded, we don't know if we want to render anything yet
    return null;
  }

  /**
   * Formatting for the enrollment times.
   */
  const date_locale_string_options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZoneName: "short"
  };

  if (enrollmentTimes.length === 0) {
    return null;
  }

  return (
    <React.Fragment>
      <h3 className="page-title center-title">Enrollment Times:</h3>
      {userInfo !== null ? (
        // done loading user info
        <div className="enrollment-container">
          {userInfo.priorityEnrollment && (
            <div className="enrollment-row">
              <div className="enrollment-course">
                <em>Priority</em>
              </div>
              <div className="enrollment-time">
                <em>{`${userInfo.priorityEnrollment.toLocaleDateString("en-US", date_locale_string_options)}`}</em>
              </div>
            </div>
          )}
          {enrollmentTimes.map(({ courseName, enrollmentDate }) => (
            <div className="enrollment-row" key={courseName}>
              <div className="enrollment-course">{courseName}</div>
              <div className="enrollment-time">
                {`${enrollmentDate.toLocaleDateString("en-US", date_locale_string_options)}`}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // userInfo is taking a while to load
        <LoadingSpinner className="spinner-centered" />
      )}
    </React.Fragment>
  );
};
