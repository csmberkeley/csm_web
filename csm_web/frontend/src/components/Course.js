import React from "react";
import { groupBy } from "lodash";
import moment from "moment";
import { post } from "../utils/api";

const API_TIME_FORMAT = "HH:mm:ss";
const DISPLAY_TIME_FORMAT = "HH:mm A";
const dayOfWeek = {
  Monday: 0,
  Tuesday: 1,
  Wednesday: 2,
  Thursday: 3,
  Friday: 4,
  Saturday: 5,
  Sunday: 6
};

function CourseDetail(props) {
  return <h1>{props.course}</h1>;
}

class Course extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      course: props.course,
      sections: {}
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.course != prevProps.course) {
      this.setState((state, props) => {
        return {
          course: props.course,
          sections: {}
        }
      });
      this.updateSections();
    }
  }

  componentDidMount() {
    this.updateSections();
  }

  updateSections() {
    fetch(`/scheduler/courses/${this.state.course}/sections/`)
      .then(response => response.json())
      .then(sections =>
        this.setState((state, props) => {
          return {
            sections: groupBy(
              sections,
              section => section.defaultSpacetime.dayOfWeek
            )
          };
        })
      );
  }

  render() {
    const days = Object.entries(this.state.sections)
      .sort((item1, item2) => {
        const day1 = dayOfWeek[item1[0]];
        const day2 = dayOfWeek[item2[0]];
        if (day1 == day2) {
          return 0;
        } else if (day1 < day2) {
          return 1;
        } else {
          return -1;
        }
      })
      .reverse()
      .map(item => {
        const [day, sections] = item;
        return <Day key={day} day={day} sections={sections} />;
      });

    return (
      <div>
        <div>
          <CourseDetail course={this.state.course} />
        </div>
        <div>
          <ul uk-accordion="true">{days}</ul>
        </div>
      </div>
    );
  }
}

function Day(props) {
  const sections = props.sections
    .sort((section1, section2) => {
      const time1 = moment(
        section1.defaultSpacetime.startTime,
        API_TIME_FORMAT
      );
      const time2 = moment(
        section2.defaultSpacetime.startTime,
        API_TIME_FORMAT
      );
      return time1 - time2;
    })
    .map((section, index) => {
      return <SectionSummary section={section} key={index} />;
    });
  return (
    <li>
      <a className="uk-accordion-title" href="#">
        {props.day}
      </a>
      <div className="uk-accordion-content">
        <ul>{sections}</ul>
      </div>
    </li>
  );
}

function SectionSummary(props) {
  function handleClick(event) {
    post(`scheduler/sections/${props.section.id}/enroll`, {}).then(response => {
      console.log(response);
    });
  }

  const spacetime = props.section.defaultSpacetime;
  const startTime = moment(spacetime.startTime, API_TIME_FORMAT).format(
    DISPLAY_TIME_FORMAT
  );
  const location = spacetime.location;

  const available = props.section.capacity - props.section.enrolledStudents;

  return (
    <li>
      <h4>
        {location} - {startTime}
      </h4>
      <p>
        {available}/{props.section.capacity}
      </p>
      <button className="uk-button uk-button-default" onClick={handleClick}>
        Enroll
      </button>
    </li>
  );
}

export default Course;
