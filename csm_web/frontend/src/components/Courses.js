import React from "react";
import { Route, Redirect } from "react-router-dom";
//import { Redirect } from "react-router-dom";
//import { groupBy } from "lodash";
//import moment from "moment";
import { fetchJSON } from "../utils/api";
import PropTypes from "prop-types";

//import { alert_modal } from "../utils/common";

export default class Courses extends React.Component {
  constructor(props) {
    super(props);
    this.state = { currentCourseId: null, courses: null, ready: false };
    this.fetchCourses = this.fetchCourses.bind(this);
  }

  static propTypes = { match: PropTypes.object };

  fetchCourses() {
    return fetchJSON(this.props.match.url).then(courses =>
      this.setState({ courses, currentCourseId: courses[0] && courses[0].id, ready: true })
    );
  }

  componentDidMount() {
    this.fetchCourses();
  }

  render() {
    if (!this.state.ready) {
      return <div>Loading courses...</div>;
    }
    return (
      <div>
        <Route path={`${this.props.match.path}/:id`} component={Course} />
        <Route
          exact
          path={this.props.match.path}
          render={() => <Redirect to={`${this.props.match.path}/${this.state.currentCourseId}`} />}
        />
        {JSON.stringify(this.state)}
      </div>
    );
  }
}

class Course extends React.Component {
  constructor(props) {
    super(props);
    this.state = { sections: null, ready: false };
    this.fetchSections = this.fetchSections.bind(this);
  }

  static propTypes = { match: PropTypes.object };

  fetchSections() {
    fetchJSON(`${this.props.match.url}/sections`).then(sections => this.setState({ sections, ready: true }));
  }

  componentDidMount() {
    this.fetchSections();
  }

  render() {
    if (!this.state.ready) {
      return <div>Loading sections for course...</div>;
    }
    return <div>{JSON.stringify(this.state)}</div>;
  }
}
