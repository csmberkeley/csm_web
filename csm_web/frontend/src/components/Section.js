import React from "react";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";

export default class Section extends React.Component {
  static propTypes = {
    match: PropTypes.shape({ params: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired }).isRequired
  };

  state = { section: null, loaded: false };

  componentDidMount() {
    fetchJSON(`/sections/${this.props.match.params.id}`).then(section => this.setState({ section, loaded: true }));
  }

  render() {
    const { section, loaded } = this.state;
    return !loaded ? null : section.isStudent ? <StudentSection {...section} /> : <MentorSection {...section} />;
  }
}

function StudentSection() {
  return <div>I am a student</div>;
}

function MentorSection() {
  return <div>I am a mentor</div>;
}
