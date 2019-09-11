import React from "react";
import { Route, NavLink } from "react-router-dom";
import { fetchJSON, fetchWithMethod, HTTP_METHODS } from "../utils/api";
import PropTypes from "prop-types";

function SectionGroup({ sections }) {
  return (
    <div className="course-sections-group">
      {sections.map(section => (
        <Section key={section.id} {...section} />
      ))}
    </div>
  );
}

SectionGroup.propTypes = { sections: PropTypes.arrayOf(PropTypes.object) };

function Section({ id, mentor, location, time, numStudentsEnrolled, capacity, placeholder }) {
  function handleEnrollment() {
    fetchWithMethod(`sections/${id}/students/`, HTTP_METHODS.PUT).then(response => {
      if (response.ok) {
        alert("Successfully enrolled in course");
      } else {
        response.json().then(({ detail }) => alert(detail));
      }
    });
  }
  return (
    <section className={numStudentsEnrolled == capacity ? "full" : undefined}>
      {!placeholder && (
        <React.Fragment>
          <div>
            <i className="fas fa-clock" />
            {time}
          </div>
          <div>
            <i className="fas fa-map-marker-alt" />
            {location}
          </div>
          <div>
            <i className="far fa-user" />
            {mentor ? mentor.name : "Mentor TBD"}
            {mentor && (
              <a className="mentor-email-link" title="Email mentor" href={`mailto:${mentor.email}`}>
                <i className="far fa-envelope" />
              </a>
            )}
          </div>
          <div className="enrollment-btn">
            <button onClick={handleEnrollment}>Enroll</button>{" "}
            <span>
              <i className="fas fa-users" /> {numStudentsEnrolled}/{capacity}
            </span>
          </div>
        </React.Fragment>
      )}
    </section>
  );
}

Section.propTypes = {
  id: PropTypes.number,
  mentor: PropTypes.object,
  location: PropTypes.string,
  time: PropTypes.string,
  numStudentsEnrolled: PropTypes.number,
  capacity: PropTypes.number,
  placeholder: PropTypes.bool
};

export default class Courses extends React.Component {
  constructor(props) {
    super(props);
    this.state = { courses: null, ready: false, sectionCache: {} };
    this.fetchCourses = this.fetchCourses.bind(this);
    this.updateSectionCache = this.updateSectionCache.bind(this);
  }

  static propTypes = { match: PropTypes.object.isRequired };

  fetchCourses() {
    fetchJSON(this.props.match.url).then(courses =>
      this.setState({ courses: Object.fromEntries(courses.map(course => [course.id, course])), ready: true })
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
    const courseLinks = Object.values(this.state.courses).map(course => (
      <NavLink key={course.id} to={`${this.props.match.path}/${course.id}`}>
        {course.name}
      </NavLink>
    ));
    return (
      <div>
        <h3 style={{ textAlign: "center" }}>Select a course to enroll in</h3>
        <nav className="course-selection">{courseLinks}</nav>
        <Route
          path={`${this.props.match.path}/:id`}
          render={routeProps => (
            <Course
              enrollmentOpen={this.state.courses[routeProps.match.params.id].enrollmentOpen}
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

const DAYS = Object.freeze(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]);
function dayComparator(day1, day2) {
  return DAYS.indexOf(day1) - DAYS.indexOf(day2);
}

class Course extends React.Component {
  constructor(props) {
    super(props);
    this.state = { sections: null, ready: false };
    this.fetchSections = this.fetchSections.bind(this);
  }

  static propTypes = {
    match: PropTypes.object.isRequired,
    cachedSections: PropTypes.object,
    updateSectionCache: PropTypes.func.isRequired,
    enrollmentOpen: PropTypes.bool.isRequired
  };

  fetchSections() {
    return fetchJSON(`${this.props.match.url}/sections?grouped=true`).then(sections => {
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
    if (!this.props.enrollmentOpen) {
      return <h4>Enrollment is not yet open for this course</h4>;
    }
    if (!this.state.ready) {
      return (
        <div className="course-sections">
          {Array(4)
            .fill()
            .map((_, i) => (
              <Section key={i} placeholder={true} />
            ))}
        </div>
      );
    }
    let sections = Object.entries(this.props.cachedSections || this.state.sections);
    sections.sort(([day1], [day2]) => dayComparator(day1, day2));
    sections = sections.map(([day, sections]) => <SectionGroup key={day} sections={sections} />);
    return <div className="course-sections">{sections}</div>;
  }
}
