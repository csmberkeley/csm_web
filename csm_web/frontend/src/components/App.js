import React, { useEffect } from "react";
import { HashRouter as Router, Route, Switch, Link } from "react-router-dom";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import CourseMenu from "./CourseMenu";
import Home from "./Home";
import Section from "./Section";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";
import LogOutIcon from "../../static/frontend/img/log_out.svg";

export default class App extends React.Component {
  state = {
    error: null,
    isDarkMode: window.localStorage.getItem("darkMode") == "true"
  };

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
        <div className={`theme-base ${this.state.isDarkMode ? "theme-dark" : "theme-light"}`}>
          <Header
            isDarkMode={this.state.isDarkMode}
            setDarkMode={mode => {
              window.localStorage.setItem("darkMode", mode);
              this.setState({ isDarkMode: mode });
            }}
          />
          <main>
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/sections/:id" component={Section} />
              <Route path="/courses" component={CourseMenu} />
            </Switch>
          </main>
        </div>
      </Router>
    );
  }
}

function Header({ isDarkMode, setDarkMode }) {
  return (
    <header>
      <Link to="/">
        <LogoNoText id="logo" />
      </Link>
      <h3 id="site-title">Scheduler</h3>
      <button
        id="dark-mode"
        onClick={() => {
          setDarkMode(!isDarkMode);
        }}
      >
        {isDarkMode ? "Disable Dark Mode" : "Enable Dark Mode"}
      </button>
      <a id="logout-btn" href="/logout" title="Log out">
        <LogOutIcon width="1.25em" height="1.25em" />
      </a>
    </header>
  );
}

Header.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  setDarkMode: PropTypes.func.isRequired
};

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
