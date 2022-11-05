import React from "react";
import { Link } from "react-router-dom";
import { groupBy } from "lodash";
import { useProfiles } from "../utils/queries/base";
import { ROLES } from "./section/Section";
import { Profile } from "../utils/types";
import LoadingSpinner from "./LoadingSpinner";

const Home = () => {
  const { data: profiles, isSuccess: profilesLoaded, isError: profilesLoadError } = useProfiles();

  let content = null;
  if (profilesLoaded) {
    // loaded, no error
    content = (
      <div className="course-cards-container">
        {Object.entries(groupBy(profiles, (profile: Profile) => [profile.course, profile.role])).map(
          ([course, courseProfiles]) => {
            if (courseProfiles[0].role === ROLES.MENTOR) {
              const courseProfilesWithSection = courseProfiles.filter((profile: Profile) => profile.sectionId);
              if (courseProfilesWithSection.length > 0) {
                return <CourseCard key={course} profiles={courseProfilesWithSection} />;
              }
              // otherwise, mentor with no section; do not show the course card
            } else {
              return <CourseCard key={course} profiles={courseProfiles} />;
            }
          }
        )}
      </div>
    );
  } else if (profilesLoadError) {
    // error during load
    content = <h3>Profiles not found</h3>;
  } else {
    // fetching profiles
    content = <LoadingSpinner />;
  }

  return (
    <div id="home-courses">
      <div id="home-courses-heading">
        <h3 className="page-title">My courses</h3>
        <Link className="csm-btn" to="/courses">
          <span className="inline-plus-sign">+ </span>Add Course
        </Link>
      </div>
      {content}
    </div>
  );
};
export default Home;

interface CourseCardProps {
  profiles: Array<Profile>;
}

const CourseCard = ({ profiles }: CourseCardProps): React.ReactElement => {
  const { course, courseTitle, role, sectionId, courseId } = profiles[0];
  const relation = role.toLowerCase();

  const Card = (): React.ReactElement => {
    return (
      <div className="course-card" style={{ borderTopColor: `var(--csm-theme-${course.toLowerCase()})` }}>
        <div className="course-card-contents">
          <h3 className="course-card-name">{course}</h3>
          <p className="course-card-title">{courseTitle}</p>
          {profiles.length > 1 &&
            profiles.map(profile => (
              <Link key={profile.id} to={`/sections/${profile.sectionId}`} className="section-link">
                {profile.sectionSpacetimes.map(spacetime => (
                  <div key={spacetime.id} className="course-card-section-time">
                    {spacetime.time}
                  </div>
                ))}
              </Link>
            ))}
          <div className="relation-label" style={{ backgroundColor: `var(--csm-${relation})` }}>
            {relation}
          </div>
        </div>
      </div>
    );
  };

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
};
