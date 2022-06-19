import React, { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useParams } from "react-router-dom";
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

  let defaultMatcher = <div>No valid roles found.</div>;
  if (roles["COORDINATOR"].size > 0) {
    defaultMatcher = <Navigate to={"/matcher/" + roles["COORDINATOR"].values().next().value} replace={true} />;
  } else if (roles["MENTOR"].size > 0) {
    defaultMatcher = <Navigate to={"/matcher/" + roles["MENTOR"].values().next().value} replace={true} />;
  }

  return (
    <div id="matcher-contents">
      <nav id="matcher-sidebar">
        <MatcherSidebar courses={staffCourses} />
      </nav>
      <div id="matcher-body">
        <div id="matcher-header"></div>
        <div id="matcher-main">
          <Routes>
            <Route
              path=":courseId"
              element={
                <MatcherCourseWrapper
                  roles={roles}
                  overrideProfile={overrideProfile}
                  mentorProfileMap={mentorProfileMap}
                  coordProfileMap={coordProfileMap}
                  switchProfile={switchProfile}
                />
              }
            />
            <Route index element={defaultMatcher} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

interface MatcherCourseWrapperProps {
  roles: Roles;
  overrideProfile: Map<number, "COORDINATOR" | "MENTOR">;
  mentorProfileMap: Map<number, Profile>;
  coordProfileMap: Map<number, Profile>;
  switchProfile: (courseId: number) => void;
}

const MatcherCourseWrapper = ({
  roles,
  overrideProfile,
  mentorProfileMap,
  coordProfileMap,
  switchProfile
}: MatcherCourseWrapperProps) => {
  const params = useParams();
  const courseId = parseInt(params.courseId!);
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
};

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
            <NavLink
              to={`/matcher/${courseId}`}
              key={courseId}
              className={({ isActive }) => `matcher-link ${isActive ? "active" : ""}`}
            >
              {courseName}
            </NavLink>
          </React.Fragment>
        );
      })}
    </React.Fragment>
  );
}
