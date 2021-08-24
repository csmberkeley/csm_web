import React, { useEffect } from "react";
import { HashRouter as Router, Route, Switch, Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import CourseMenu from "./CourseMenu";
import Home from "./Home";
import Section from "./Section";
import { Resources } from "./resource_aggregation/Resources.tsx";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";
import LogOutIcon from "../../static/frontend/img/log_out.svg";

import { config } from "@fortawesome/fontawesome-svg-core";
config.autoAddCss = false; // remove inline styling

export default class App extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  clearError = () => {
    this.setState({ error: null });
  };

  render() {
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
            </Switch>
          </main>
        </React.Fragment>
      </Router>
    );
  }
}

function Header() {
  /**
   * Helper function to determine whether or not "Scheduler" should be active.
   * That is, it should always be active unless we're in a location prefixed by /resources
   */
  function schedulerActive(match, location) {
    return !location.pathname.startsWith("/resources");
  }

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
      <a id="logout-btn" href="/logout" title="Log out">
        <LogOutIcon width="1.25em" height="1.25em" />
      </a>
    </header>
  );
}

function ErrorPage({ error: { message, stack }, clearError }) {
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
          Please report this on the Slack channel #tech-ask. Include a screenshot of this page along with an explanation
          of what you were trying to accomplish when you encountered this error
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

ErrorPage.propTypes = {
  error: PropTypes.shape({ message: PropTypes.string.isRequired, stack: PropTypes.string.isRequired }).isRequired,
  clearError: PropTypes.func.isRequired
};

const wrapper = document.getElementById("app");
wrapper ? ReactDOM.render(<App />, wrapper) : null;
