import React from "react";
import PropTypes from "prop-types";
import { Link, Route, Switch } from "react-router-dom";
import { fetchJSON } from "../utils/api";
import Course from "./Course";
import LoadingSpinner from "./LoadingSpinner";

export default class CourseMenu extends React.Component {
  state = { courses: null, loaded: false };

  static propTypes = { match: PropTypes.shape({ path: PropTypes.string.isRequired }).isRequired };

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
    return (
      <Switch>
        <Route
          path="/courses/:id"
          render={routeProps => (
            <Course name={loaded && courses.get(Number(routeProps.match.params.id)).name} {...routeProps} />
          )}
        />
        <Route
          path="/courses"
          render={() => (
            <React.Fragment>
              <h3 className="page-title center-title">Which course would you like to enroll in?</h3>
              {!loaded ? (
                <LoadingSpinner id="course-menu-loading-spinner" />
              ) : (
                <div id="course-menu">
                  {Array.from(courses.entries()).map(([id, { name }]) => (
                    <Link className="csm-btn" to={`${path}/${id}`} key={id}>
                      {name}
                    </Link>
                  ))}
                </div>
              )}
            </React.Fragment>
          )}
        />
      </Switch>
    );
  }
}
