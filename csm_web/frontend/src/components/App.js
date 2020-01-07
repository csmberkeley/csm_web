import React from "react";
import { MemoryRouter as Router, Route, Switch, Link } from "react-router-dom";
import ReactDOM from "react-dom";
import CourseMenu from "./CourseMenu";
import Home from "./Home";
import Section from "./Section";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";

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
      <div id="header-menu">
        <img id="user-profile-pic" height="52" width="52" src="https://calcentral.berkeley.edu/api/my/photo" />
        <a id="logout-btn" href="/logout">
          Logout
        </a>
      </div>
    </header>
  );
}

const wrapper = document.getElementById("app");
wrapper ? ReactDOM.render(<App />, wrapper) : null;
