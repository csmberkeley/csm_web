import React, { useEffect, useState } from "react";
import { HashRouter as Router, Route, Switch, Link, NavLinkProps } from "react-router-dom";
import { NavLink } from "react-router-dom";
import ReactDOM from "react-dom";
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

interface AppState {
  error: ErrorType | null;
}

interface ErrorPageProps {
  error: ErrorType;
  clearError: () => void;
}

export default class App extends React.Component {
  state: AppState = { error: null };

  static getDerivedStateFromError(error: ErrorType): { error: ErrorType } {
    return { error };
  }

  clearError = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      return <ErrorPage error={this.state.error} clearError={this.clearError} />;
    }

    return (
      <Router>
        <React.Fragment>
          <Header />
          <main>
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/sections/:id" component={Section} />
              <Route path="/courses" component={CourseMenu} />
              <Route path="/resources" component={Resources} />
              <Route path="/matcher" component={EnrollmentMatcher} />
              <Route path="/policies" component={Policies} />
            </Switch>
          </main>
        </React.Fragment>
      </Router>
    );
  }
}

function Header(): React.ReactElement {
  /**
   * Helper function to determine whether or not "Scheduler" should be active.
   * That is, it should always be active unless we're in a location prefixed by /resources or /matcher
   */
  const schedulerActive: NavLinkProps["isActive"] = (match, location): boolean => {
    return (
      !location.pathname.startsWith("/resources") &&
      !location.pathname.startsWith("/matcher") &&
      !location.pathname.startsWith("/policies")
    );
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
      <NavLink isActive={schedulerActive} to="/" className="site-title-link" activeClassName="is-active">
        <h3 className="site-title">Scheduler</h3>
      </NavLink>
      <NavLink to="/resources" className="site-title-link" activeClassName="is-active">
        <h3 className="site-title">Resources</h3>
      </NavLink>
      {activeMatcherRoles["COORDINATOR"].size > 0 || activeMatcherRoles["MENTOR"].size > 0 ? (
        <NavLink to="/matcher" className="site-title-link" activeClassName="is-active">
          <h3 className="site-title">Matcher</h3>
        </NavLink>
      ) : null}
      <NavLink to="/policies" className="site-subtitle-link" activeClassName="is-active">
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

const wrapper: HTMLElement | null = document.getElementById("app");
wrapper ? ReactDOM.render(<App />, wrapper) : null;
