import React from "react";
import { MemoryRouter as Router, Route, Redirect } from "react-router-dom";
import ReactDOM from "react-dom";
import Section from "./Section";
//import Course from "./Course";
//import CourseNav from "./CourseNav";
//import Navbar from "./Navbar";
import { fetchJSON } from "../utils/api";

function Courses() {
  return <div>Courses</div>;
}

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
    const { currentProfile, mentorProfiles } = this.state;
    return (
      <Router>
        <React.Fragment>
          <Route
            path="/"
            exact
            render={() => <Redirect to={currentProfile ? `/sections/${currentProfile.section}/` : "/courses/"} />}
          />
          <Route
            path="/sections/:id"
            render={routeProps => (
              <Section
                currentProfileId={currentProfile.id}
                isMentor={mentorProfiles.map(profile => profile.id).includes(currentProfile.id)}
                {...routeProps}
              />
            )}
          />
          <Route path="/courses/" component={Courses} />
        </React.Fragment>
      </Router>
    );
  }
}

const wrapper = document.getElementById("app");
wrapper ? ReactDOM.render(<App />, wrapper) : null;
