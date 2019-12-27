import React from "react";
import { fetchJSON } from "../utils/api";
import LocationIcon from "../../static/frontend/img/location.svg";
import UserIcon from "../../static/frontend/img/user.svg";
import GroupIcon from "../../static/frontend/img/group.svg";
import ClockIcon from "../../static/frontend/img/clock.svg";

export default class Course extends React.Component {
  state = { sections: null, loaded: false }; // Sections are grouped by day

  componentDidMount() {
    const { id } = this.props.match.params;
    fetchJSON(`/courses/${id}/sections`).then(sections => this.setState({ sections, loaded: true }));
  }

  render() {
    return !this.state.loaded ? null : (
      <div>
        {Object.values(this.state.sections)
          .flat()
          .map(section => (
            <SectionCard key={section.id} {...section} />
          ))}
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
