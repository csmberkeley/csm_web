import React from "react";
import {
  MemoryRouter as Router,
  Route,
  Link,
  Redirect
} from "react-router-dom";
import ReactDOM from "react-dom";
import Section from "./Section";
import Course from "./Course";
import CourseNav from "./CourseNav";
import Navbar from "./Navbar";

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
    const profilesEndpoint = "/scheduler/profiles/";
    return fetch(profilesEndpoint)
      .then(response => response.json())
      .then(profiles => {
        this.setState(
          (state, props) => {
            return {
              profiles_ct: profiles.length
            };
          },
          () => {
            for (let profile of profiles) {
              let id = profile.id;
              fetch(`${profilesEndpoint}${id}/?verbose=true`)
                .then(response => response.json())
                .then(profileData =>
                  this.setState((state, props) => {
                    return {
                      profiles: { [id]: profileData, ...state.profiles },
                      sections: {
                        [profileData.section.id]: profileData.section,
                        ...state.sections
                      }
                    };
                  })
                )
                .then(() => this.updateReadyState());
            }
          }
        );
      });
  }

  updateCourses() {
    return fetch("/scheduler/courses")
      .then(response => response.json())
      .then(courses => {
        this.setState((state, props) => {
          let courses_map = {};
          courses.map(course => {
            courses_map[course.name] = course;
          });

          return {
            courses: courses_map
          };
        });
      })
      .then(() => this.updateReadyState());
  }

  updateReadyState() {
    if (
      this.state.courses != null &&
      this.state.profiles_ct != null &&
      Object.keys(this.state.profiles).length == this.state.profiles_ct
    ) {
      this.setState((state, props) => {
        return {
          ready: true
        };
      });
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
                } else if (this.state.profiles_ct == 0) {
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
                if (
                  !Object.keys(this.state.sections).includes(match.params.id)
                ) {
                  // This might be a newly added section
                  this.updateProfiles();
                  this.updateCourses();
                  return <LoadingSplash />;
                } else {
                  return <Section {...this.state.sections[match.params.id]} />;
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
    <div class="loading-splash">
      <h3>Loading...</h3>
    </div>
  );
}

const wrapper = document.getElementById("app");

wrapper ? ReactDOM.render(<App />, wrapper) : null;
export default App;
