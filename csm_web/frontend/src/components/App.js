import React from "react";
import { MemoryRouter as Router, Route, Redirect, NavLink } from "react-router-dom";
import ReactDOM from "react-dom";
import Section from "./Section";
import Courses from "./Courses";
//import CourseNav from "./CourseNav";
import { fetchJSON } from "../utils/api";
import LogoNoText from "./LogoNoText.svg";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { studentProfiles: null, mentorProfiles: null, currentProfile: null, ready: false };
    this.fetchProfiles = this.fetchProfiles.bind(this);
  }

  fetchProfiles() {
    fetchJSON("profiles/").then(({ studentProfiles, mentorProfiles }) => {
      this.setState({
        studentProfiles,
        mentorProfiles,
        currentProfile: studentProfiles[0] || mentorProfiles[0],
        ready: true
      });
    });
  }

  componentDidMount() {
    this.fetchProfiles();
  }

  render() {
    if (!this.state.ready) {
      return <div>Loading...</div>;
    }
    const { currentProfile, mentorProfiles, studentProfiles } = this.state;
    return (
      <Router>
        <React.Fragment>
          <Header />
          <Route
            path="/"
            exact
            render={() => <Redirect to={currentProfile ? `/sections/${currentProfile.section}` : "/courses"} />}
          />
          <Route
            path="/sections/:id"
            render={routeProps => (
              <Section
                key={routeProps.match.params.id}
                currentProfileId={
                  mentorProfiles
                    .concat(studentProfiles)
                    .filter(profile => profile.section == routeProps.match.params.id)[0].id
                }
                isMentor={mentorProfiles.map(profile => profile.section).includes(Number(routeProps.match.params.id))}
                {...routeProps}
              />
            )}
          />
          <Route path="/courses" component={Courses} />
        </React.Fragment>
      </Router>
    );
  }
}

function Header() {
  return (
    <header>
      <NavLink to="/">
        <LogoNoText id="logo" />
      </NavLink>
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
