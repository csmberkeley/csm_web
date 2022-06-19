import React, { useEffect, useState } from "react";
import { Route, Link, NavLink, NavLinkProps, Routes, useLocation, Outlet } from "react-router-dom";
import CourseMenu from "./CourseMenu";
import Home from "./Home";
import Section from "./section/Section";
import Policies from "./Policies";
import { Resources } from "./resource_aggregation/Resources";
import { EnrollmentMatcher } from "./enrollment_automation/EnrollmentMatcher";

import LogoNoText from "../../static/frontend/img/logo_no_text.svg";
import LogOutIcon from "../../static/frontend/img/log_out.svg";
import { emptyRoles, Roles } from "../utils/user";
import { fetchJSON } from "../utils/api";
import { Profile } from "../utils/types";

interface ErrorType {
  message: string;
  stack: string;
}

interface ErrorPageProps {
  error: ErrorType;
  clearError: () => void;
}

const App = () => {
  const [error, setError] = useState<ErrorType | null>(null);

  const clearError = (): void => {
    setError(null);
  };

  if (error !== null) {
    return <ErrorPage error={error} clearError={clearError} />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Home />} />
        <Route path="sections/:id/*" element={<Section />} />
        <Route path="courses/*" element={<CourseMenu />} />
        <Route path="resources/*" element={<Resources />} />
        <Route path="matcher/*" element={<EnrollmentMatcher />} />
        <Route path="policies/*" element={<Policies />} />
      </Route>
    </Routes>
  );
};
export default App;

/**
 * Layout for the main app.
 */
const AppLayout = () => {
  return (
    <React.Fragment>
      <Header />
      <main>
        <Outlet />
      </main>
    </React.Fragment>
  );
};

function Header(): React.ReactElement {
  const location = useLocation();

  /**
   * Helper function to determine class name for a NavLink component
   * depending on whether it is currently active.
   */
  const navlinkClass: NavLinkProps["className"] = ({ isActive }): string => {
    return `site-title-link ${isActive ? "is-active" : ""}`;
  };

  const navlinkClassSubtitle: NavLinkProps["className"] = ({ isActive }): string => {
    return `site-subtitle-link ${isActive ? "is-active" : ""}`;
  };

  /**
   * Helper function to determine class name for the home NavLInk component;
   * is always active unless we're in another tab.
   */
  const homeNavlinkClass = () => {
    let isActive = true;
    if (
      location.pathname.startsWith("/resources") ||
      location.pathname.startsWith("/matcher") ||
      location.pathname.startsWith("/policies")
    ) {
      isActive = false;
    }
    return navlinkClass({ isActive });
  };

  const [activeMatcherRoles, setActiveMatcherRoles] = useState<Roles>(emptyRoles());

  useEffect(() => {
    Promise.all([fetchJSON("/profiles"), fetchJSON("/matcher/active")]).then(
      ([profiles, activeMatcherCourses]: [Profile[], number[]]) => {
        const roles = emptyRoles();
        // get roles, but only if coordinator or mentor with no section
        for (const profile of profiles) {
          if (!activeMatcherCourses.includes(profile.courseId)) {
            // ignore if not active
            continue;
          }
          if (profile.role === "COORDINATOR") {
            roles["COORDINATOR"].add(profile.courseId);
          } else if (profile.role === "MENTOR" && profile.sectionId === undefined) {
            roles["MENTOR"].add(profile.courseId);
          }
        }
        setActiveMatcherRoles(roles);
      }
    );
  }, []);

  return (
    <header>
      <Link to="/">
        <LogoNoText id="logo" />
      </Link>
      <NavLink className={homeNavlinkClass} to="/">
        <h3 className="site-title">Scheduler</h3>
      </NavLink>
      <NavLink to="/resources" className={navlinkClass}>
        <h3 className="site-title">Resources</h3>
      </NavLink>
      {activeMatcherRoles["COORDINATOR"].size > 0 || activeMatcherRoles["MENTOR"].size > 0 ? (
        <NavLink to="/matcher" className={navlinkClass}>
          <h3 className="site-title">Matcher</h3>
        </NavLink>
      ) : null}
      <NavLink to="/policies" className={navlinkClassSubtitle}>
        <h3 className="site-subtitle">Policies</h3>
      </NavLink>
      <a id="logout-btn" href="/logout" title="Log out">
        <LogOutIcon width="1.25em" height="1.25em" />
      </a>
    </header>
  );
}

function ErrorPage({ error: { message, stack }, clearError }: ErrorPageProps) {
  useEffect(() => {
    const prevHistoryFunc = window.onpopstate;
    window.onpopstate = () => {
      clearError();
      window.onpopstate = prevHistoryFunc;
    };
  }, [clearError]);
  return (
    <React.Fragment>
      <main id="fatal-error-page">
        <h1>A fatal error has occurred!</h1>
        <h2 className="page-title">If you&apos;re a mentor:</h2>
        <p>
          Please report this on the Slack channel #tech-bugs. Include a screenshot of this page along with an
          explanation of what you were trying to accomplish when you encountered this error
        </p>
        <h2 className="page-title">If you&apos;re a student:</h2>
        <p>
          Please email <a href="mailto:mentors@berkeley.edu">mentors@berkeley.edu</a> with subject line &quot;[Scheduler
          Error Report]&quot; with a screenshot of this page along with an explanation of what you were trying to
          accomplish when you encountered this error
        </p>
      </main>
      <div id="stack-trace">
        <pre>
          {message + "\n\n"}
          {stack}
        </pre>
      </div>
    </React.Fragment>
  );
}
