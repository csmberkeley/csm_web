import React, { useMemo } from "react";
import { Link, Route, Routes } from "react-router-dom";
import { useCourses, useUserInfo } from "../utils/query";
import { Course as CourseType, UserInfo } from "../utils/types";
import Course from "./course/Course";
import LoadingSpinner from "./LoadingSpinner";

const CourseMenu = () => {
  const { data: jsonCourses, isLoading: coursesLoading } = useCourses();
  const { data: jsonUserInfo, isLoading: userInfoLoading } = useUserInfo();

  /**
   * Transform JSON courses into a map of course IDs to course objects.
   */
  const courses = useMemo<Map<number, CourseType>>(() => {
    if (jsonCourses && !coursesLoading) {
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
    if (jsonUserInfo && !userInfoLoading) {
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
          coursesLoading ? (
            // loading courses; don't render course component yet
            <LoadingSpinner className="spinner-centered" />
          ) : (
            <Course
              courses={courses}
              priorityEnrollment={userInfo.priorityEnrollment}
              enrollmentTimes={enrollment_times_by_course}
            />
          )
        }
      />
      <Route
        index
        element={
          <React.Fragment>
            <EnrollmentMenu courses={courses} coursesLoading={coursesLoading} />
            <br />
            <EnrollmentTimes
              coursesLoading={coursesLoading}
              userInfo={userInfo}
              userInfoLoading={userInfoLoading}
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
  coursesLoading: boolean;
}

/**
 * Displays the list of courses.
 *
 * If courses have not been loaded, this component will display a loading spinner.
 */
const EnrollmentMenu = ({ courses, coursesLoading }: EnrollmentMenuProps) => {
  return (
    <React.Fragment>
      <h3 className="page-title center-title">Which course would you like to enroll in?</h3>
      {coursesLoading ? (
        <LoadingSpinner id="course-menu-loading-spinner" />
      ) : (
        <div id="course-menu">
          {Array.from(courses.entries()).map(([id, course]) => (
            <Link className="csm-btn" to={`${location.pathname}/${id}`} key={id}>
              {course.name}
            </Link>
          ))}
        </div>
      )}
    </React.Fragment>
  );
};

interface EnrollmentTimesProps {
  coursesLoading: boolean;
  userInfo: UserInfo;
  userInfoLoading: boolean;
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
  coursesLoading,
  userInfo,
  userInfoLoading
}: EnrollmentTimesProps): React.ReactElement | null => {
  if (coursesLoading) {
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
      {userInfoLoading ? (
        // userInfo is taking a while to load
        <LoadingSpinner className="spinner-centered" />
      ) : (
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
      )}
    </React.Fragment>
  );
};
