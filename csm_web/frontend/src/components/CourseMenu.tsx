import { DateTime } from "luxon";
import React, { useEffect, useState } from "react";
import { Link, Route, Routes } from "react-router-dom";

import { DEFAULT_LONG_LOCALE_OPTIONS, DEFAULT_TIMEZONE } from "../utils/datetime";
import { useUserInfo } from "../utils/queries/base";
import { useCourses } from "../utils/queries/courses";
import { Course as CourseType, UserInfo } from "../utils/types";
import LoadingSpinner from "./LoadingSpinner";
import Course from "./course/Course";

import "../css/course-menu.scss";

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
      priorityEnrollment = DateTime.fromISO(jsonUserInfo.priorityEnrollment, { zone: DEFAULT_TIMEZONE });
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

  const enrollment_times_by_course: Array<{ courseName: string; enrollmentDate: DateTime }> = [];

  if (courses !== null) {
    for (const course of courses.values()) {
      if (!course.enrollmentOpen) {
        enrollment_times_by_course.push({
          courseName: course.name,
          enrollmentDate: DateTime.fromISO(course.enrollmentStart, { zone: DEFAULT_TIMEZONE })
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
          <CourseMenuContent
            courses={courses}
            coursesLoaded={coursesLoaded}
            userInfo={userInfo}
            enrollment_times_by_course={enrollment_times_by_course}
          />
        }
      />
    </Routes>
  );
};
export default CourseMenu;

interface CourseMenuContentProps {
  courses: Map<number, CourseType> | null;
  coursesLoaded: boolean;
  userInfo: UserInfo | null;
  enrollment_times_by_course: Array<{ courseName: string; enrollmentDate: DateTime }>;
}

enum CourseMenuSidebarTabs {
  RESTRICTED = "RESTRICTED",
  UNRESTRICTED = "UNRESTRICTED"
}

const CourseMenuContent = ({
  courses,
  coursesLoaded,
  userInfo,
  enrollment_times_by_course
}: CourseMenuContentProps) => {
  const [selectedTab, setSelectedTab] = useState<CourseMenuSidebarTabs>(CourseMenuSidebarTabs.RESTRICTED);
  const [hasRestrictedCourses, setHasRestrictedCourses] = useState<boolean>(false);
  const [unrestrictedCourses, setUnrestrictedCourses] = useState<Map<number, CourseType>>(new Map());
  const [restrictedCourses, setRestrictedCourses] = useState<Map<number, CourseType>>(new Map());

  useEffect(() => {
    let curHasRestrictedCourses = false;
    const curRestrictedCourses: Map<number, CourseType> = new Map();
    const curUnrestrictedCourses: Map<number, CourseType> = new Map();

    if (courses != null) {
      for (const [courseId, course] of courses.entries()) {
        curHasRestrictedCourses ||= course.isRestricted;
        if (course.isRestricted) {
          curRestrictedCourses.set(courseId, course);
        } else {
          curUnrestrictedCourses.set(courseId, course);
        }
      }
    }

    setHasRestrictedCourses(curHasRestrictedCourses);
    setRestrictedCourses(curRestrictedCourses);
    setUnrestrictedCourses(curUnrestrictedCourses);
    if (!curHasRestrictedCourses) {
      // reset to unrestricted courses
      setSelectedTab(CourseMenuSidebarTabs.UNRESTRICTED);
    } else {
      setSelectedTab(CourseMenuSidebarTabs.RESTRICTED);
    }
  }, [courses, coursesLoaded]);

  let sidebar = null;
  if (hasRestrictedCourses) {
    /**
     * Helper to get the current tab class
     */
    const getTabClass = (expected: CourseMenuSidebarTabs) => {
      if (selectedTab === expected) {
        return "tab active";
      } else {
        return "tab";
      }
    };

    sidebar = (
      <div className="tab-list">
        <button
          className={getTabClass(CourseMenuSidebarTabs.RESTRICTED)}
          onClick={() => setSelectedTab(CourseMenuSidebarTabs.RESTRICTED)}
        >
          Restricted
        </button>
        <button
          className={getTabClass(CourseMenuSidebarTabs.UNRESTRICTED)}
          onClick={() => setSelectedTab(CourseMenuSidebarTabs.UNRESTRICTED)}
        >
          Unrestricted
        </button>
      </div>
    );
  }
  // courses to actually display
  let displayCourses = new Map();
  if (selectedTab === CourseMenuSidebarTabs.RESTRICTED) {
    displayCourses = restrictedCourses;
  } else if (selectedTab === CourseMenuSidebarTabs.UNRESTRICTED) {
    displayCourses = unrestrictedCourses;
  }

  // get set of all course names to display
  const displayCourseNames = new Set<string>(Array.from(displayCourses.values()).map(course => course.name));
  const displayEnrollmentTimes = enrollment_times_by_course.filter(course => displayCourseNames.has(course.courseName));

  return (
    <div className="course-menu-content">
      {sidebar}
      <div className="course-menu-main">
        <EnrollmentMenu courses={displayCourses} />
        <br />
        <EnrollmentTimes coursesLoaded={coursesLoaded} userInfo={userInfo} enrollmentTimes={displayEnrollmentTimes} />
      </div>
    </div>
  );
};

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
      {courses !== null && courses.size !== 0 ? (
        <div id="course-menu">
          {Array.from(courses.entries()).map(([id, course]) => (
            <Link className="primary-btn" to={`${id}`} key={id}>
              {course.name}
            </Link>
          ))}
        </div>
      ) : (
        <div>
          <br></br>
          <h2 className="page-title center-title">Enrollment Times: TBD</h2>
        </div>
      )}
    </React.Fragment>
  );
};

interface EnrollmentTimesProps {
  coursesLoaded: boolean;
  userInfo: UserInfo | null;
  enrollmentTimes: Array<{ courseName: string; enrollmentDate: DateTime }>;
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
                <em>{`${userInfo.priorityEnrollment.toLocaleString(DEFAULT_LONG_LOCALE_OPTIONS)}`}</em>
              </div>
            </div>
          )}
          {enrollmentTimes.map(({ courseName, enrollmentDate }) => (
            <div className="enrollment-row" key={courseName}>
              <div className="enrollment-course">{courseName}</div>
              <div className="enrollment-time">{`${enrollmentDate.toLocaleString(DEFAULT_LONG_LOCALE_OPTIONS)}`}</div>
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
