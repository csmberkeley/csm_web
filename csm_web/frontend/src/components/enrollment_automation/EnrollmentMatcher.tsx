import React, { useEffect, useState } from "react";
import { NavLink, Redirect, Route, Switch } from "react-router-dom";
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
  const [coordProfileMap, setCoordProfileMap] = useState<Map<number, Profile>>(new Map());
  const [mentorProfileMap, setMentorProfileMap] = useState<Map<number, Profile>>(new Map());
  const [staffCourses, setStaffCourses] = useState<Array<MatcherProfile>>([]);

  const [overrideProfile, setOverrideProfile] = useState<Map<number, "COORDINATOR" | "MENTOR">>(new Map());

  useEffect(() => {
    Promise.all([fetchJSON("/profiles"), fetchJSON("/matcher/active")]).then(([profiles, activeCourses]) => {
      const newCourses: Array<MatcherProfile> = [];
      const newRoles: Roles = emptyRoles();
      const newCoordProfileMap: Map<number, Profile> = new Map();
      const newMentorProfileMap: Map<number, Profile> = new Map();
      const newOverrideProfile: Map<number, "COORDINATOR" | "MENTOR"> = new Map();

      profiles.map((profile: Profile) => {
        if (profile.role === "COORDINATOR") {
          newCoordProfileMap.set(profile.courseId, profile);
        } else if (profile.role === "MENTOR") {
          newMentorProfileMap.set(profile.courseId, profile);
        }

        if (profile.role === "COORDINATOR" || (profile.role === "MENTOR" && profile.sectionId == null)) {
          if (!activeCourses.includes(profile.courseId)) {
            // ignore if not active
            return;
          }
          newCourses.push({
            courseId: profile.courseId,
            courseName: profile.course,
            courseTitle: profile.courseTitle,
            role: profile.role
          });
          newRoles[profile.role].add(profile.courseId);

          if (profile.role === "COORDINATOR") {
            newOverrideProfile.set(profile.courseId, "COORDINATOR");
          } else if (profile.role === "MENTOR") {
            newOverrideProfile.set(profile.courseId, "MENTOR");
          }
        }
      });

      setRoles(newRoles);
      setCoordProfileMap(newCoordProfileMap);
      setMentorProfileMap(newMentorProfileMap);
      setOverrideProfile(newOverrideProfile);

      // sort by course name
      newCourses.sort((a, b) => {
        return a.courseName.localeCompare(b.courseName);
      });
      setStaffCourses(newCourses);
    });
  }, []);

  const switchProfile = (courseId: number) => {
    if (overrideProfile.has(courseId)) {
      const newOverrideProfile = new Map(overrideProfile);
      if (overrideProfile.get(courseId) === "COORDINATOR") {
        newOverrideProfile.set(courseId, "MENTOR");
      } else if (overrideProfile.get(courseId) === "MENTOR") {
        newOverrideProfile.set(courseId, "COORDINATOR");
      }
      setOverrideProfile(newOverrideProfile);
    }
  };

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
                const coordAndMentor = roles["COORDINATOR"].has(courseId) && roles["MENTOR"].has(courseId);
                const role = overrideProfile.get(courseId);

                if (role === "COORDINATOR") {
                  return (
                    <CoordinatorMatcherForm
                      profile={coordProfileMap.get(courseId)!}
                      switchProfileEnabled={coordAndMentor}
                      switchProfile={() => switchProfile(courseId)}
                    />
                  );
                } else if (role === "MENTOR") {
                  return (
                    <MentorSectionPreferences
                      profile={mentorProfileMap.get(courseId)!}
                      switchProfileEnabled={coordAndMentor}
                      switchProfile={() => switchProfile(courseId)}
                    />
                  );
                } else {
                  return <div></div>;
                }
              }}
            />
            <Route
              path="/matcher"
              render={() => {
                if (roles["COORDINATOR"].size > 0) {
                  return <Redirect to={"/matcher/" + roles["COORDINATOR"].values().next().value} push={false} />;
                } else if (roles["MENTOR"].size > 0) {
                  return <Redirect to={"/matcher/" + roles["MENTOR"].values().next().value} push={false} />;
                } else {
                  return <div>No valid roles found.</div>;
                }
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
