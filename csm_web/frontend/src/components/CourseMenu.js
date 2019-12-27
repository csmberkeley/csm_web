import React from "react";
import { Link } from "react-router-dom";
import { fetchJSON } from "../utils/api";

export default class CourseMenu extends React.Component {
  state = { courses: null, loaded: false };

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
      <React.Fragment>
        <h3 className="page-title" style={{ textAlign: "center" }}>
          Which course would you like to enroll in?
        </h3>
        <div id="course-menu">
          {Object.entries(courses).map(([id, { name }]) => (
            <Link className="csm-btn" to={`${path}/${id}`} key={id}>
              {name}
            </Link>
          ))}
        </div>
      </React.Fragment>
    );
  }
}
