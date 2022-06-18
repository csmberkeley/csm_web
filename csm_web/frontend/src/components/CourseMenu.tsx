import React, { useEffect, useState } from "react";
import { Link, Route, Switch } from "react-router-dom";
import { fetchJSON } from "../utils/api";
import Course from "./course/Course";
import LoadingSpinner from "./LoadingSpinner";

interface CourseType {
  id: number;
  name: string;
  enrollmentOpen: boolean;
  enrollmentStart: string;
}

interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  priorityEnrollment?: Date;
}

interface CourseMenuProps {
  match: { path: string };
}

const CourseMenu = ({ match: { path } }: CourseMenuProps) => {
  const [courses, setCourses] = useState<Map<number, CourseType>>(null as never);
  const [userInfo, setUserInfo] = useState<UserInfo>(null as never);
  const [loaded, setLoaded] = useState<boolean>(false);

  useEffect(() => {
    fetchJSON("/courses").then(courses => {
      // We use a Map here instead of an object because we want the entries() iterator to reflect the order of insertion,
      // which in turn reflects the sorting order returned by the backend
      const coursesById = new Map();
      for (const course of courses) {
        coursesById.set(course.id, course);
      }
      setCourses(coursesById);
      setLoaded(true);
    });
    fetchJSON("/userinfo").then(userInfo => {
      let priorityEnrollment = null;
      if (userInfo.priorityEnrollment) {
        priorityEnrollment = new Date(Date.parse(userInfo.priorityEnrollment));
      }
      const convertedUserInfo: UserInfo = {
        ...userInfo,
        priorityEnrollment
      };
      setUserInfo(convertedUserInfo);
    });
  }, []);

  let show_enrollment_times = false;
  const enrollment_times_by_course: Array<{ courseName: string; enrollmentDate: Date }> = [];

  if (loaded) {
    for (const course of courses.values()) {
      show_enrollment_times = show_enrollment_times || !course.enrollmentOpen;
      if (!course.enrollmentOpen) {
        enrollment_times_by_course.push({
          courseName: course.name,
          enrollmentDate: new Date(Date.parse(course.enrollmentStart))
        });
      }
    }
  }

  const enrollment_menu = (
    <React.Fragment>
      <h3 className="page-title center-title">Which course would you like to enroll in?</h3>
      {!loaded ? (
        <LoadingSpinner id="course-menu-loading-spinner" />
      ) : (
        <div id="course-menu">
          {Array.from(courses.entries()).map(([id, course]) => (
            <Link
              className={"csm-btn" + (course.enrollmentOpen ? "" : " disabled")}
              to={course.enrollmentOpen ? `${path}/${id}` : "#"}
              key={id}
            >
              {course.name}
            </Link>
          ))}
        </div>
      )}
    </React.Fragment>
  );

  const date_locale_string_options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZoneName: "short"
  };

  const enrollment_times = (
    <React.Fragment>
      <h3 className="page-title center-title">Enrollment Times:</h3>
      <div className="enrollment-container">
        {userInfo && userInfo.priorityEnrollment && (
          <div className="enrollment-row">
            <div className="enrollment-course">
              <em>Priority</em>
            </div>
            <div className="enrollment-time">
              <em>{`${userInfo.priorityEnrollment.toLocaleDateString("en-US", date_locale_string_options)}`}</em>
            </div>
          </div>
        )}
        {enrollment_times_by_course.map(({ courseName, enrollmentDate }) => (
          <div className="enrollment-row" key={courseName}>
            <div className="enrollment-course">{courseName}</div>
            <div className="enrollment-time">{`${enrollmentDate.toLocaleDateString(
              "en-US",
              date_locale_string_options
            )}`}</div>
          </div>
        ))}
      </div>
    </React.Fragment>
  );

  return (
    <Switch>
      <Route
        path="/courses/:id"
        render={(routeProps: any) => {
          if (loaded) {
            // only render if loaded
            const course = courses.get(Number(routeProps.match.params.id))!;
            const isOpen = course && course.enrollmentOpen;
            // use key to rerender when manually changing URL
            return <Course key={course.id} name={loaded && course.name} isOpen={isOpen} {...routeProps} />;
          }
        }}
      />
      <Route
        path="/courses"
        render={() => (
          <React.Fragment>
            {courses && courses.size > 0 && enrollment_menu}
            <br />
            {show_enrollment_times && enrollment_times}
          </React.Fragment>
        )}
      />
    </Switch>
  );
};
export default CourseMenu;
