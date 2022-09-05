import React, { useMemo } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { useCourses, useUserInfo } from "../utils/queries/base";
import { Course as CourseType, UserInfo } from "../utils/types";
import Course from "./course/Course";
import LoadingSpinner from "./LoadingSpinner";

const CourseMenu = () => {
  const { data: jsonCourses, isSuccess: coursesLoaded } = useCourses();
  const { data: jsonUserInfo, isSuccess: userInfoLoaded } = useUserInfo();

  /**
   * Transform JSON courses into a map of course IDs to course objects.
   */
  const courses = useMemo<Map<number, CourseType>>(() => {
    if (coursesLoaded) {
      // We use a Map here instead of an object because we want the entries() iterator to reflect the order of insertion,
      // which in turn reflects the sorting order returned by the backend
      const coursesById = new Map<number, CourseType>();
      for (const course of jsonCourses) {
        coursesById.set(course.id, course);
      }
      return coursesById;
    }
    // not done loading yet
    return undefined as never;
  }, [jsonCourses]);

  /**
   * Transform JSON user info into a user info object.
   */
  const userInfo = useMemo<UserInfo>(() => {
    if (userInfoLoaded) {
      let priorityEnrollment = undefined;
      if (jsonUserInfo.priorityEnrollment) {
        priorityEnrollment = new Date(Date.parse(jsonUserInfo.priorityEnrollment));
      }
      const convertedUserInfo: UserInfo = {
        ...jsonUserInfo,
        priorityEnrollment
      };
      return convertedUserInfo;
    }
    // not done loading yet
    return undefined as never;
  }, [jsonUserInfo]);

  let show_enrollment_times = false;
  const enrollment_times_by_course: Array<{ courseName: string; enrollmentDate: Date }> = [];

  console.log(courses);

  if (courses) {
    for (const course of courses.values()) {
      show_enrollment_times ||= !course.enrollmentOpen;
      if (!course.enrollmentOpen) {
        enrollment_times_by_course.push({
          courseName: course.name,
          enrollmentDate: new Date(Date.parse(course.enrollmentStart))
        });
      }
    }
    console.log(show_enrollment_times);
  }

  return (
    <Routes>
      <Route
        path=":courseId/*"
        element={
          coursesLoaded ? (
            <Course
              courses={courses}
              priorityEnrollment={userInfo.priorityEnrollment}
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
            <EnrollmentMenu courses={courses} coursesLoaded={coursesLoaded} />
            <br />
            <EnrollmentTimes
              coursesLoaded={coursesLoaded}
              userInfo={userInfo}
              userInfoLoaded={userInfoLoaded}
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
  courses: Map<number, CourseType>;
  coursesLoaded: boolean;
}

/**
 * Displays the list of courses.
 *
 * If courses have not been loaded, this component will display a loading spinner.
 */
const EnrollmentMenu = ({ courses, coursesLoaded }: EnrollmentMenuProps) => {
  return (
    <React.Fragment>
      <h3 className="page-title center-title">Which course would you like to enroll in?</h3>
      {coursesLoaded ? (
        <div id="course-menu">
          {Array.from(courses.entries()).map(([id, course]) => (
            <Link className="csm-btn" to={`${location.pathname}/${id}`} key={id}>
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
  userInfo: UserInfo;
  userInfoLoaded: boolean;
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
  userInfo,
  userInfoLoaded
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
      {userInfoLoaded ? (
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
