import React from "react";

function CourseDetail(props) {
  return <h1>{props.course}</h1>;
}

function Course(props) {
  return (
    <div>
      <CourseDetail course={props.course} />
    </div>
  );
}

function Day(props) {}

function SectionSummary(props) {}

export default Course;
