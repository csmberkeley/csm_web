import { groupBy } from "lodash";
import React from "react";
import { Link } from "react-router-dom";

import { formatSpacetimeInterval } from "../utils/datetime";
import { useProfiles } from "../utils/queries/base";
import { useCourses } from "../utils/queries/courses";
import { Profile, Course, Role } from "../utils/types";
import LoadingSpinner from "./LoadingSpinner";

import FileExport from "../../static/frontend/img/file-export.svg";
import PlusIcon from "../../static/frontend/img/plus.svg";
import SettingsGear from "../../static/frontend/img/settings-gear.svg";

import scssColors from "../css/base/colors-export.module.scss";

const Home = () => {
  const { data: profiles, isSuccess: profilesLoaded, isError: profilesLoadError } = useProfiles();
  const { data: courses, isSuccess: coursesLoaded, isError: coursesLoadError } = useCourses();

  let content = null;
  let headingRight = null;
  if (profilesLoaded && coursesLoaded) {
    // loaded, no error
    const coursesById: Map<number, Course> = new Map();
    for (const courseObj of courses) {
      coursesById.set(courseObj.id, courseObj);
    }

    content = (
      <div className="course-cards-container">
        {Object.entries(groupBy(profiles, (profile: Profile) => [profile.course, profile.role]))
          .sort(([courseNameA, courseProfilesA], [courseNameB, courseProfilesB]) => {
            const compare = (a: string, b: string) => a.localeCompare(b);
            const courseA = coursesById.get(courseProfilesA[0].courseId);
            const courseB = coursesById.get(courseProfilesB[0].courseId);
            if (courseA === undefined || courseB === undefined) {
              return compare(courseNameA, courseNameB);
            } else if (courseA.isRestricted !== courseB.isRestricted) {
              return courseA.isRestricted ? -1 : 1;
            } else {
              return compare(courseNameA, courseNameB);
            }
          })
          .map(([course, courseProfiles]) => {
            if (courseProfiles[0].role === Role.MENTOR) {
              const courseProfilesWithSection = courseProfiles.filter((profile: Profile) => profile.sectionId);
              if (courseProfilesWithSection.length > 0) {
                return <CourseCard key={course} profiles={courseProfilesWithSection} />;
              }
              // otherwise, mentor with no section; do not show the course card
            } else {
              return <CourseCard key={course} profiles={courseProfiles} />;
            }
          })}
      </div>
    );

    const isCoordinator = profiles!.some(profile => profile.role === Role.COORDINATOR);

    if (isCoordinator) {
      headingRight = (
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <Link className="primary-btn" to="/settings">
            <SettingsGear className="icon" />
            Settings
          </Link>
          <Link className="primary-btn" to="/export">
            <FileExport className="icon" />
            Export
          </Link>
        </div>
      );
    }
  } else if (profilesLoadError) {
    // error during load
    content = <h3>Profiles not found</h3>;
  } else if (coursesLoadError) {
    // error during load
    content = <h3>Courses not found</h3>;
  } else {
    // fetching profiles/courses
    content = <LoadingSpinner />;
  }

  return (
    <div id="home-courses">
      <div id="home-courses-heading">
        <div id="home-courses-heading-left">
          <h3 className="page-title">My courses</h3>
          <Link className="primary-btn" to="/courses">
            <PlusIcon className="icon inline-plus-icon" />
            Add Course
          </Link>
        </div>
        <div id="home-courses-heading-right">{headingRight}</div>
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
    // default to black if not found
    const courseColor = scssColors[course.toLowerCase()] ?? "black";
    const relationColor = scssColors[relation.toLowerCase()] ?? "white";
    return (
      <div className="course-card" style={{ borderTopColor: courseColor }}>
        <div className="course-card-contents">
          <h3 className="course-card-name">{course}</h3>
          <p className="course-card-title">{courseTitle}</p>
          {profiles.length > 1 &&
            profiles.map(profile => (
              <Link key={profile.id} to={`/sections/${profile.sectionId}`} className="section-link">
                {profile.sectionSpacetimes.map(spacetime => (
                  <div key={spacetime.id} className="course-card-section-time">
                    {formatSpacetimeInterval(spacetime)}
                  </div>
                ))}
              </Link>
            ))}
          <div className="relation-label" style={{ backgroundColor: relationColor }}>
            {relation}
          </div>
        </div>
      </div>
    );
  };

  if (role === Role.COORDINATOR) {
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
