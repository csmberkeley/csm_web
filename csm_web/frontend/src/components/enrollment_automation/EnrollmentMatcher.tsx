import React, { useEffect, useState } from "react";
import { NavLink, Route, Switch } from "react-router-dom";
import { fetchJSON } from "../../utils/api";
import { Profile } from "../../utils/types";

import { emptyRoles, Roles } from "../../utils/user";
import { CoordinatorMatcherForm } from "./coordinator/CoordinatorMatcherForm";
import { MentorSectionPreferences } from "./MentorSectionPreferences";

export interface MatcherProfile {
  courseId: number;
  courseName: string;
  courseTitle: string;
  role: string;
}

export function EnrollmentMatcher(): JSX.Element {
  const [roles, setRoles] = useState<Roles>(emptyRoles());
  const [profileMap, setProfileMap] = useState<Map<number, Profile>>(new Map());
  const [staffCourses, setStaffCourses] = useState<Array<MatcherProfile>>([]);

  useEffect(() => {
    Promise.all([fetchJSON("/profiles"), fetchJSON("/matcher/active")]).then(([profiles, activeCourses]) => {
      const new_courses: Array<MatcherProfile> = [];
      const new_roles: Roles = emptyRoles();
      const new_profile_map: Map<number, Profile> = new Map();

      profiles.map((profile: Profile) => {
        const existing_profile = new_profile_map.get(profile.courseId);
        if (existing_profile == undefined || existing_profile.role !== "COORDINATOR") {
          new_profile_map.set(profile.courseId, profile);
        }
        if (profile.role === "COORDINATOR" || (profile.role === "MENTOR" && profile.sectionId == null)) {
          if (!activeCourses.includes(profile.courseId)) {
            // ignore if not active
            return;
          }
          new_courses.push({
            courseId: profile.courseId,
            courseName: profile.course,
            courseTitle: profile.courseTitle,
            role: profile.role
          });
          new_roles[profile.role].add(profile.courseId);
        }
      });

      setRoles(new_roles);
      setProfileMap(new_profile_map);

      // sort by course name
      new_courses.sort((a, b) => {
        return a.courseName.localeCompare(b.courseName);
      });
      setStaffCourses(new_courses);
    });
  }, []);

  if (roles["COORDINATOR"].size === 0 && roles["MENTOR"].size === 0) {
    return <div>No matchers found</div>;
  }

  return (
    <div id="matcher-contents">
      <nav id="matcher-sidebar">
        <MatcherSidebar courses={staffCourses} />
      </nav>
      <div id="matcher-body">
        <div id="matcher-header"></div>
        <div id="matcher-main">
          <Switch>
            <Route
              exact
              path="/matcher/:courseId"
              render={(routeProps: any) => {
                const courseId = parseInt(routeProps.match.params.courseId);
                const profile = profileMap.get(courseId);
                if (profile == undefined) {
                  return <div></div>;
                } else if (roles["COORDINATOR"].has(courseId)) {
                  return <CoordinatorMatcherForm profile={profileMap.get(courseId)!} />;
                } else if (roles["MENTOR"].has(courseId)) {
                  return <MentorSectionPreferences profile={profileMap.get(courseId)!} />;
                }
              }}
            />
            <Route
              path="/matcher"
              render={() => {
                return <h4>Enrollment Matcher</h4>;
              }}
            />
          </Switch>
        </div>
      </div>
    </div>
  );
}

interface MatcherSidebarProps {
  courses: Array<MatcherProfile>;
}

function MatcherSidebar({ courses }: MatcherSidebarProps): JSX.Element {
  const uniqueCourseMap: Map<number, MatcherProfile> = new Map();
  courses.map((course: MatcherProfile) => {
    uniqueCourseMap.set(course.courseId, course);
  });
  return (
    <React.Fragment>
      {Array.from(uniqueCourseMap.values()).map(({ courseId, courseName }) => {
        return (
          <React.Fragment key={courseId}>
            <NavLink to={`/matcher/${courseId}`} key={courseId} className="matcher-link" activeClassName="active">
              {courseName}
            </NavLink>
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
}
