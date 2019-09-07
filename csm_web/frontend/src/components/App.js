import React from "react";
import { MemoryRouter as Router, Route, Redirect } from "react-router-dom";
import ReactDOM from "react-dom";
//import Section from "./Section";
//import Course from "./Course";
//import CourseNav from "./CourseNav";
//import Navbar from "./Navbar";
import { fetchJSON } from "../utils/api";

function Courses() {
  return <div>Courses</div>;
}

function Section() {
  return <div>Section</div>;
}

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { studentProfiles: null, mentorProfiles: null, currentProfileId: null, ready: false };
    this.fetchProfiles = this.fetchProfiles.bind(this);
  }

  fetchProfiles() {
    fetchJSON("profiles/").then(({ studentProfiles, mentorProfiles }) => {
      const currentProfile = studentProfiles[0] || mentorProfiles[0];
      this.setState({
        studentProfiles,
        mentorProfiles,
        currentProfileId: currentProfile && currentProfile.id,
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
    const { currentProfileId, mentorProfiles } = this.state;
    return (
      <Router>
        <React.Fragment>
          <Route
            path="/"
            exact
            render={() => (
              <Redirect to={currentProfileId == undefined ? "/courses/" : `/sections/${currentProfileId}/`} />
            )}
          />
          <Route
            path="/sections/:id"
            render={routeProps => (
              <Section
                isMentor={mentorProfiles.map(profile => profile.id).includes(currentProfileId)}
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
