import React from "react";
import { MemoryRouter as Router, Route, Link } from "react-router-dom";
import ReactDOM from "react-dom";
import Section from "./Section";
import Course from "./Course";
import Navbar from "./Navbar";

class App extends React.Component {
  state = {
    sections: {},
    profiles: {},
    courses: {}
  };

  componentDidMount() {
    const profilesEndpoint = "/scheduler/profiles/";
    fetch(profilesEndpoint)
      .then(response => response.json())
      .then(profiles => {
        for (let profile of profiles) {
          let id = profile.id;
          fetch(`${profilesEndpoint}${id}/?verbose=true`)
            .then(response => response.json())
            .then(profileData =>
              this.setState((state, props) => {
                return {
                  profiles: { [id]: profileData, ...state.profiles },
                  sections: { [id]: profileData.section, ...state.sections }
                };
              })
            );
        }
      });

    fetch("/scheduler/courses")
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
      });
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
              path="/sections/:id"
              render={({ match }) => (
                <Section
                  profile={match.params.id}
                  {...this.state.sections[match.params.id]}
                />
              )}
            />
            <Route
              path="/courses/:slug"
              render={({ match }) => (
                <Course
                  course={this.state.courses[match.params.slug.toUpperCase()]}
                />
              )}
            />
          </div>
        </Router>
      </div>
    );
  }
}

const wrapper = document.getElementById("app");

wrapper ? ReactDOM.render(<App />, wrapper) : null;
export default App;
