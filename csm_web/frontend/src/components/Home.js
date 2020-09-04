import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import { ROLES, PROFILE_SHAPE } from "../utils/types";
import { groupBy } from "lodash";
import { fetchJSON } from "../utils/api";

export default class Home extends React.Component {
  state = { profiles: [], profilesLoaded: false };

  componentDidMount() {
    fetchJSON("/profiles").then(profiles => this.setState({ profiles, profilesLoaded: true }));
  }

  render() {
    const { profiles, profilesLoaded } = this.state;
    return (
      <div id="home-courses">
        <div id="home-courses-heading">
          <h3 className="page-title">My courses</h3>
          <Link className="csm-btn" to="/courses">
            <span className="inline-plus-sign">+ </span>Add Course
          </Link>
        </div>
        {profilesLoaded && (
          <div className="course-cards-container">
            {Object.entries(groupBy(profiles, profile => profile.course)).map(([course, courseProfiles]) => (
              <CourseCard key={course} profiles={courseProfiles} />
            ))}
          </div>
        )}
      </div>
    );
  }
}

function getSectionTimeString(profile) {
  return profile.sectionSpacetime.time + (profile.secondSectionSpacetime ? profile.secondSectionSpacetime.time : "");
}

function CourseCard({ profiles }) {
  const { course, courseTitle, role, sectionId, courseId } = profiles[0];
  const relation = role.toLowerCase();
  function Card() {
    return (
      <div className="course-card" style={{ borderTopColor: `var(--csm-theme-${course.toLowerCase()})` }}>
        <div className="course-card-contents">
          <h3 className="course-card-name">{course}</h3>
          <p className="course-card-title">{courseTitle}</p>
          {profiles.length > 1 &&
            profiles.map(profile => (
              <Link key={profile.id} to={`/sections/${profile.sectionId}`} className="section-link">
                {getSectionTimeString(profile)}
              </Link>
            ))}
          <div className="relation-label" style={{ backgroundColor: `var(--csm-${relation})` }}>
            {relation}
          </div>
        </div>
      </div>
    );
  }
  if (role === ROLES.COORDINATOR) {
    return (
      <Link to={`/courses/${courseId}`} className="course-card-link">
        <Card />
      </Link>
    );
  }
  return profiles.length === 1 ? (
    <Link to={`/sections/${sectionId}`} className="course-card-link">
      <Card />
    </Link>
  ) : (
    <Card />
  );
}

CourseCard.propTypes = { profiles: PropTypes.arrayOf(PROFILE_SHAPE).isRequired };
