import React from "react";
import PropTypes from "prop-types";
import { Link, Route, Switch } from "react-router-dom";
import { fetchJSON } from "../utils/api";
import Course from "./Course";

export default class CourseMenu extends React.Component {
  state = { courses: null, loaded: false };

  static propTypes = { match: PropTypes.shape({ path: PropTypes.string.isRequired }).isRequired };

  componentDidMount() {
    fetchJSON("/courses").then(courses => {
      const coursesById = {};
      for (const course of courses) {
        coursesById[course.id] = course;
      }
      this.setState({ courses: coursesById, loaded: true });
    });
  }

  render() {
    const { path } = this.props.match;
    const { loaded, courses } = this.state;
    return !loaded ? (
      <div>Loading...</div>
    ) : (
      <Switch>
        <Route
          path="/courses/:id"
          render={routeProps => <Course name={courses[routeProps.match.params.id].name} {...routeProps} />}
        />
        <Route
          path="/courses"
          render={() => (
            <React.Fragment>
              <h3 className="page-title center-title">Which course would you like to enroll in?</h3>
              <div id="course-menu">
                {Object.entries(courses).map(([id, { name }]) => (
                  <Link className="csm-btn" to={`${path}/${id}`} key={id}>
                    {name}
                  </Link>
                ))}
              </div>
            </React.Fragment>
          )}
        />
      </Switch>
    );
  }
}
