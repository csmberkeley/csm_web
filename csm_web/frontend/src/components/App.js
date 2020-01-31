import React from "react";
import { HashRouter as Router, Route, Switch, Link } from "react-router-dom";
import ReactDOM from "react-dom";
import CourseMenu from "./CourseMenu";
import Home from "./Home";
import Section from "./Section";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";
import LogOutIcon from "../../static/frontend/img/log_out.svg";

export default class App extends React.Component {
  render() {
    return (
      <Router>
        <React.Fragment>
          <Header />
          <main>
            <Switch>
              <Route exact path="/" component={Home} />
              <Route path="/sections/:id" component={Section} />
              <Route path="/courses" component={CourseMenu} />
            </Switch>
          </main>
        </React.Fragment>
      </Router>
    );
  }
}

function Header() {
  return (
    <header>
      <Link to="/">
        <LogoNoText id="logo" />
      </Link>
      <h3 id="site-title">Scheduler</h3>
      <a id="logout-btn" href="/logout" title="Log out">
        <LogOutIcon width="1.25em" height="1.25em" />
      </a>
    </header>
  );
}

const wrapper = document.getElementById("app");
wrapper ? ReactDOM.render(<App />, wrapper) : null;
