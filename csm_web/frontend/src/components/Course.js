import React from "react";
import { groupBy } from "lodash";

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

  componentDidMount() {
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
  return (
    <li>
      <a className="uk-accordion-title" href="#">
        {props.day}
      </a>
      <div className="uk-accordion-content">Lorem ipsum dolor sit amet</div>
    </li>
  );
}

function SectionSummary(props) {}

export default Course;
