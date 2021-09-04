import React from "react";
import PropTypes from "prop-types";
import { Link, Route, Switch } from "react-router-dom";
import { fetchJSON } from "../utils/api";
import Course from "./Course";
import LoadingSpinner from "./LoadingSpinner";

interface CourseType {
  id: number;
  name: string;
  enrollmentOpen: boolean;
}

interface CourseMenuState {
  courses: Map<number, CourseType>;
  loaded: boolean;
}

interface CourseMenuProps {
  match: { path: string };
}

export default class CourseMenu extends React.Component<CourseMenuProps> {
  state: CourseMenuState = { courses: null, loaded: false };

  componentDidMount() {
    fetchJSON("/courses").then(courses => {
      // We use a Map here instead of an object because we want the entries() iterator to reflect the order of insertion,
      // which in turn reflects the sorting order returned by the backend
      const coursesById = new Map();
      for (const course of courses) {
        coursesById.set(course.id, course);
      }
      this.setState({ courses: coursesById, loaded: true });
    });
  }

  render() {
    const { path } = this.props.match;
    const { loaded, courses } = this.state;
    const show_enrollment_times = true;

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

    const enrollment_times = (
      <React.Fragment>
        <h3 className="page-title center-title">Enrollment will open:</h3>
        <p className="center-title">Wednesday 9/8 at 7 PM for CS61B, CS88</p>
        <p className="center-title">Thursday 9/9 at 7 PM for CS61C, CS70, EECS16A</p>
        <p className="center-title">Friday 9/10 at 7 PM for CS61A, EECS16B</p>
      </React.Fragment>
    );

    return (
      <Switch>
        <Route
          path="/courses/:id"
          render={routeProps => {
            const course = loaded && courses.get(Number(routeProps.match.params.id));
            const isOpen = course && course.enrollmentOpen;
            if (isOpen) {
              return <Course name={loaded && course.name} {...routeProps} />;
            } else {
              return <h3 className="page-title center-title">Enrollment is not open.</h3>;
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
  }
}
