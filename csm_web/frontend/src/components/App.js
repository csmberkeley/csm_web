import React from "react";
import { MemoryRouter as Router, Route, Switch, Link } from "react-router-dom";
import PropTypes from "prop-types";
import ReactDOM from "react-dom";
import CourseMenu from "./CourseMenu";
import { fetchJSON } from "../utils/api";
import { groupBy } from "lodash";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { profiles: [], profilesLoaded: false };
  }

  componentDidMount() {
    fetchJSON("/profiles").then(profiles => this.setState({ profiles, profilesLoaded: true }));
  }

  render() {
    return (
      <Router>
        <React.Fragment>
          <Header />
          <main>
            <Switch>
              <Route
                exact
                path="/"
                render={() => <Home profiles={this.state.profiles} profilesLoaded={this.state.profilesLoaded} />}
              />
              <Route path="/sections/:id" />
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

const profileShape = PropTypes.shape({
  id: PropTypes.number.isRequired,
  sectionId: PropTypes.number.isRequired,
  sectionSpacetime: PropTypes.string.isRequired,
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  isStudent: PropTypes.bool.isRequired
});

function Home({ profiles, profilesLoaded }) {
  return (
    <div id="home-courses">
      <div id="home-courses-heading">
        <h3 className="page-title">My courses</h3>
        <Link className="csm-btn" to="/courses">
          <span className="inline-plus-sign">+ </span>Add Course
        </Link>
      </div>
      {profilesLoaded && (
        <div className="course-cards-container">
          {Object.entries(groupBy(profiles, profile => profile.course)).map(([course, courseProfiles]) => (
            <CourseCard key={course} profiles={courseProfiles} />
          ))}
        </div>
      )}
    </div>
  );
}

Home.propTypes = { profiles: PropTypes.arrayOf(profileShape).isRequired, profilesLoaded: PropTypes.bool.isRequired };

function CourseCard({ profiles }) {
  const { course, courseTitle } = profiles[0];
  return (
    <div className="course-card" style={{ borderTopColor: `var(--csm-theme-${course.toLowerCase()})` }}>
      <div className="course-card-contents">
        <h3 className="course-card-name">{course}</h3>
        <p className="course-card-title">{courseTitle}</p>
      </div>
    </div>
  );
}

CourseCard.propTypes = {
  profiles: PropTypes.arrayOf(profileShape).isRequired
};

const wrapper = document.getElementById("app");
wrapper ? ReactDOM.render(<App />, wrapper) : null;
