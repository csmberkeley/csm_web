import React from "react";
import { MemoryRouter as Router, Route, Redirect } from "react-router-dom";
import ReactDOM from "react-dom";
import Section from "./Section";
import Course from "./Course";
import CourseNav from "./CourseNav";
import Navbar from "./Navbar";
import { fetchJSON } from "../utils/api";

class App extends React.Component {
  state = {
    sections: {},
    profiles: {},
    courses: null,
    profiles_ct: null,
    ready: false
  };

  componentDidMount() {
    this.updateProfiles();
    this.updateCourses();
  }

  updateProfiles() {
    const profilesEndpoint = "profiles/";
    return fetchJSON(profilesEndpoint).then(profiles => {
      this.setState({ profiles_ct: profiles.length }, () => {
        for (let profile of profiles) {
          let id = profile.id;
          fetchJSON(`${profilesEndpoint}${id}/?verbose=true`)
            .then(profileData =>
              this.setState(state => {
                let sections = { ...state.sections };
                if (profileData.section) {
                  sections[[profileData.section.id]] = profileData.section;
                }
                return {
                  profiles: { [id]: profileData, ...state.profiles },
                  sections: sections
                };
              })
            )
            .then(() => this.updateReadyState());
        }
      });
    });
  }

  updateCourses() {
    return fetchJSON("courses/")
      .then(courses => {
        this.setState({
          courses: courses.reduce((coursesMap, course) => {
            coursesMap[course.name] = course;
            return coursesMap;
          }, {})
        });
      })
      .then(() => this.updateReadyState());
  }

  updateReadyState() {
    if (
      this.state.courses != null &&
      this.state.profiles_ct != null &&
      Object.keys(this.state.profiles).length === this.state.profiles_ct
    ) {
      this.setState({ ready: true });
    }
  }

  render() {
    return (
      <div>
        <Router>
          <div>
            <Navbar
              sections={this.state.sections}
              courses={this.state.courses}
            />
            <Route
              path="/"
              exact
              render={() => {
                if (!this.state.ready) {
                  return <LoadingSplash />;
                } else if (this.state.profiles_ct === 0) {
                  return <Redirect to="/courses/" push />;
                } else {
                  const firstSection = `/sections/${
                    Object.keys(this.state.sections)[0]
                  }`;
                  return <Redirect to={firstSection} push />;
                }
              }}
            />
            <Route
              path="/sections/:id"
              render={({ match }) => {
                if (!this.state.sections.hasOwnProperty(match.params.id)) {
                  // This might be a newly added section
                  this.updateProfiles();
                  this.updateCourses();
                  return <LoadingSplash />;
                } else {
                  // We lookup the matching profile manually for this state because a
                  // page linking to this might not have access to profile data. (i.e.
                  // the Course listing page. This is fine since there are few profiles
                  // per user.

                  let matchingProfile = null;
                  for (let [profileID, profile] of Object.entries(
                    this.state.profiles
                  )) {
                    if (
                      profile.section &&
                      profile.section.id === Number(match.params.id)
                    ) {
                      matchingProfile = profileID;
                      break;
                    }
                  }

                  // TODO might need to catch null fallthrough here
                  return (
                    <Section
                      profile={matchingProfile}
                      key={match.params.id}
                      {...this.state.sections[match.params.id]}
                    />
                  );
                }
              }}
            />
            <Route
              path="/courses/"
              exact
              render={() => <CourseNav courses={this.state.courses} />}
            />
            <Route
              path="/courses/:slug"
              render={({ match }) => (
                <Course course={this.state.courses[match.params.slug]} />
              )}
            />
          </div>
        </Router>
      </div>
    );
  }
}

function LoadingSplash() {
  return (
    <div className="loading-splash">
      <h3>Loading...</h3>
    </div>
  );
}

const wrapper = document.getElementById("app");

wrapper ? ReactDOM.render(<App />, wrapper) : null;
export default App;
