import React from "react";
import { Route, NavLink } from "react-router-dom";
import { fetchJSON } from "../utils/api";
import PropTypes from "prop-types";

export default class Courses extends React.Component {
  constructor(props) {
    super(props);
    this.state = { currentCourseId: null, courses: null, ready: false, sectionCache: {} };
    this.fetchCourses = this.fetchCourses.bind(this);
    this.updateSectionCache = this.updateSectionCache.bind(this);
  }

  static propTypes = { match: PropTypes.object };

  fetchCourses() {
    return fetchJSON(this.props.match.url).then(courses =>
      this.setState({ courses, currentCourseId: courses[0] && courses[0].id, ready: true })
    );
  }

  updateSectionCache(courseId, sections) {
    this.setState(state => ({ sectionCache: { ...state.sectionCache, [courseId]: sections } }));
  }

  componentDidMount() {
    this.fetchCourses();
  }

  render() {
    if (!this.state.ready) {
      return <div>Loading courses...</div>;
    }
    return (
      <div>
        {this.state.courses.map(course => (
          <NavLink key={course.id} to={`${this.props.match.path}/${course.id}`}>
            {course.name}
          </NavLink>
        ))}
        <Route
          path={`${this.props.match.path}/:id`}
          render={routeProps => (
            <Course
              updateSectionCache={this.updateSectionCache}
              cachedSections={this.state.sectionCache[routeProps.match.params.id]}
              key={routeProps.match.params.id}
              {...routeProps}
            />
          )}
        />
        {JSON.stringify(this.state)}
      </div>
    );
  }
}

class Course extends React.Component {
  constructor(props) {
    super(props);
    this.state = { sections: null, ready: false };
    this.fetchSections = this.fetchSections.bind(this);
  }

  static propTypes = { match: PropTypes.object, cachedSections: PropTypes.array, updateSectionCache: PropTypes.func };

  fetchSections() {
    return fetchJSON(`${this.props.match.url}/sections`).then(sections => {
      this.setState({ sections, ready: true });
      return sections;
    });
  }

  componentDidMount() {
    if (!this.props.cachedSections) {
      this.fetchSections().then(sections => this.props.updateSectionCache(this.props.match.params.id, sections));
    } else {
      this.setState({ ready: true });
    }
  }

  render() {
    if (!this.state.ready) {
      return <div>Loading sections for course...</div>;
    }
    return <div>{JSON.stringify(this.props.cachedSections || this.state.sections)}</div>;
  }
}
