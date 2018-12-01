import React from "react";

function SectionSummary(props) {
  return (
    <div>
      <p>
        {props.defaultSpacetime.dayOfWeek} {props.defaultSpacetime.startTime} -{" "}
        {props.defaultSpacetime.endTime}
      </p>
      <p>{props.defaultSpacetime.location}</p>
      <p>
        {props.mentor.mentorName}{" "}
        <a href={`mailto:${props.mentor.mentorEmail}`}>
          {props.mentor.mentorEmail}
        </a>
      </p>
    </div>
  );
}

function WeekAttendance(props) {
  const studentAttendances = Object.entries(props.attendance);
  const studentAttendanceListEntries = studentAttendances.map(
    (attendance, index) => (
      <li key={index}> {`${attendance[0]} ${attendance[1]}`} </li>
    )
  );
  return (
    <div>
      <h4>Week {props.weekNum}</h4>
      <ul>{studentAttendanceListEntries}</ul>
    </div>
  );
}

function Attendances(props) {
  const attendances = props.attendances;
  const weekAttendances = attendances.map((attendance, index) => (
    <WeekAttendance attendance={attendance} weekNum={index} key={index} />
  ));
  return <div>{weekAttendances}</div>;
}

function Section(props) {
  return (
    <div>
      <SectionSummary
        defaultSpacetime={props.defaultSpacetime}
        mentor={props.mentor}
      />
      <Attendances attendances={props.attendances} />
    </div>
  );
}

export default Section;
