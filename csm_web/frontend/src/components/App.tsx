import React, { Component, useEffect, useState } from "react";
import { Link, NavLink, NavLinkProps, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { logout } from "../utils/api";
import { useProfiles } from "../utils/queries/base";
import { useMatcherActiveCourses } from "../utils/queries/matcher";
import { Role } from "../utils/types";
import { emptyRoles, Roles } from "../utils/user";
import CourseMenu from "./CourseMenu";
import Home from "./Home";
import Policies from "./Policies";
import { DataExport } from "./data_export/DataExport";
import { EnrollmentMatcher } from "./enrollment_automation/EnrollmentMatcher";
import { Resources } from "./resource_aggregation/Resources";
import Section from "./section/Section";
import { SettingsPage } from "./settings/SettingsPage";

import LogOutIcon from "../../static/frontend/img/log_out.svg";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";

import "../css/header.scss";
import "../css/home.scss";

interface ErrorType {
  message: string;
  stack: string;
}

interface ErrorPageProps {
  error: ErrorType;
  clearError: () => void;
}

const App = () => {
  return (
    <ErrorBoundary>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="sections/:id/*" element={<Section />} />
          <Route path="courses/*" element={<CourseMenu />} />
          <Route path="resources/*" element={<Resources />} />
          <Route path="matcher/*" element={<EnrollmentMatcher />} />
          <Route path="policies/*" element={<Policies />} />
          <Route path="export/*" element={<DataExport />} />
          <Route path="settings/*" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ErrorBoundary>
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

  const { data: profiles, isSuccess: profilesLoaded } = useProfiles();
  const { data: matcherActiveCourses, isSuccess: matcherActiveCoursesLoaded } = useMatcherActiveCourses();

  useEffect(() => {
    if (!profilesLoaded || !matcherActiveCoursesLoaded) return;

    const roles = emptyRoles();
    // get roles, but only if coordinator or mentor with no section
    for (const profile of profiles) {
      if (!matcherActiveCourses.includes(profile.courseId)) {
        // ignore if not active
        continue;
      }
      if (profile.role === Role.COORDINATOR) {
        roles[Role.COORDINATOR].add(profile.courseId);
      } else if (profile.role === Role.MENTOR && profile.sectionId === undefined) {
        roles[Role.MENTOR].add(profile.courseId);
      }
    }
    setActiveMatcherRoles(roles);
  }, [profiles, matcherActiveCourses]);

  return (
    <header>
      <div className="site-title-group">
        <Link to="/">
          <LogoNoText id="logo" />
        </Link>
        <NavLink className={homeNavlinkClass} to="/">
          <h3 className="site-title">Scheduler</h3>
        </NavLink>
        <NavLink to="/resources" className={navlinkClass}>
          <h3 className="site-title">Resources</h3>
        </NavLink>
        {activeMatcherRoles[Role.COORDINATOR].size > 0 || activeMatcherRoles[Role.MENTOR].size > 0 ? (
          <NavLink to="/matcher" className={navlinkClass}>
            <h3 className="site-title">Matcher</h3>
          </NavLink>
        ) : null}
      </div>
      <div className="site-title-group">
        <NavLink to="/policies" className={navlinkClassSubtitle}>
          <h3 className="site-subtitle">Policies</h3>
        </NavLink>
        <a id="logout-btn" href="#" onClick={logout} title="Log out">
          <LogOutIcon className="icon" />
        </a>
      </div>
    </header>
  );
}

/**
 * 404 not found page.
 */
const NotFound = () => {
  return <h3>Page not found</h3>;
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: ErrorType | null;
}

interface ErrorType {
  message: string;
  stack: string;
}

interface ErrorPageProps {
  error: ErrorType;
  clearError: () => void;
}

/**
 * Error boundary component; must be a class component,
 * as there is currently no equivalent hook.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: ErrorType): { error: ErrorType } {
    return { error };
  }

  clearError(): void {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error !== null) {
      return <ErrorPage error={this.state.error} clearError={this.clearError} />;
    }
    return this.props.children;
  }
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
