import React from "react";
import { fetchJSON } from "../utils/api";
import LocationIcon from "../../static/frontend/img/location.svg";
import UserIcon from "../../static/frontend/img/user.svg";
import GroupIcon from "../../static/frontend/img/group.svg";
import ClockIcon from "../../static/frontend/img/clock.svg";

const DAY_OF_WEEK_ABREVIATIONS = Object.freeze({
  Mon: "M",
  Tue: "Tu",
  Wed: "W",
  Thu: "Th",
  Fri: "F",
  Sat: "Sa",
  Sun: "Su"
});

export default class Course extends React.Component {
  state = { sections: null, loaded: false, day: "" }; // Sections are grouped by day

  componentDidMount() {
    const { id } = this.props.match.params;
    fetchJSON(`/courses/${id}/sections`).then(sections =>
      this.setState({ sections, loaded: true, day: Object.keys(sections)[0] })
    );
  }

  render() {
    const { loaded, sections, day: currDay } = this.state;
    return !loaded ? null : (
      <div id="course-section-selector">
        <div id="course-section-controls">
					<h2 className="course-title">{this.props.name}</h2>
          <div id="day-selector">
            {Object.keys(sections).map(day => (
              <button
                className={`day-btn ${day == currDay ? "active" : ""}`}
                key={day}
                onClick={() => this.setState({ day })}
              >
                {DAY_OF_WEEK_ABREVIATIONS[day]}
              </button>
            ))}
          </div>
        </div>
        <div id="course-section-list">
          {sections[currDay].map(section => (
            <SectionCard key={section.id} {...section} />
          ))}
        </div>
      </div>
    );
  }
}

function SectionCard({ id, location, time, mentor, numStudentsEnrolled, capacity }) {
  const iconWidth = "1.3em";
  const iconHeight = "1.3em";
  return (
    <section className="section-card">
      <div className="section-card-contents">
        <p title="Location">
          <LocationIcon width={iconWidth} height={iconHeight} /> {location}
        </p>
        <p title="Time">
          <ClockIcon width={iconWidth} height={iconHeight} /> {time}
        </p>
        <p title="Mentor">
          <UserIcon width={iconWidth} height={iconHeight} /> {mentor.name}
        </p>
        <p title="Current enrollment">
          <GroupIcon width={iconWidth} height={iconHeight} /> {`${numStudentsEnrolled}/${capacity}`}
        </p>
      </div>
      <div className="csm-btn section-card-footer">ENROLL</div>
    </section>
  );
}
