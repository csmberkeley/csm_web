import React from "react";
import { Route, NavLink } from "react-router-dom";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import PropTypes from "prop-types";

function Section({ id, mentor, location, time }) {
  function handleEnrollment() {
    fetchWithMethod(`sections/${id}/students/`, HTTP_METHODS.PUT);
  }
  return (
    <div>
      {id} {mentor.name} {mentor.email} {location} {time}
      <button onClick={handleEnrollment}>Enroll</button>
    </div>
  );
}

Section.propTypes = {
  id: PropTypes.number,
  mentor: PropTypes.object,
  location: PropTypes.string,
  time: PropTypes.string
};

export default class Courses extends React.Component {
  constructor(props) {
    super(props);
    this.state = { courses: null, ready: false, sectionCache: {} };
    this.fetchCourses = this.fetchCourses.bind(this);
    this.updateSectionCache = this.updateSectionCache.bind(this);
  }

  static propTypes = { match: PropTypes.object };

  fetchCourses() {
    fetchJSON(this.props.match.url).then(courses => this.setState({ courses, ready: true }));
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
    return (
      <div>
        {(this.props.cachedSections || this.state.sections).map(section => (
          <Section key={section.id} {...section} />
        ))}
      </div>
    );
  }
}
