import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";
import { SPACETIME_SHAPE } from "../utils/types";
import StudentSection from "./StudentSection";
import MentorSection from "./MentorSection";

export default function Section({
  match: {
    url,
    params: { id }
  }
}) {
  const [{ section, loaded }, setState] = useState({ section: null, loaded: false });
  useEffect(() => {
    fetchJSON(`/sections/${id}`).then(section => setState({ section, loaded: true }));
  }, [id]);

  return !loaded ? null : section.isStudent ? (
    <StudentSection url={url} {...section} />
  ) : (
    <MentorSection url={url} id={Number(id)} {...section} />
  );
}

Section.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
    url: PropTypes.string.isRequired
  }).isRequired
};

export function SectionHeader({ course, courseTitle, isStudent }) {
  const relation = isStudent ? "student" : "mentor";
  return (
    <div className="section-detail-header">
      <div className="section-detail-header-title">
        <h3>{course}</h3>
        <h4>{courseTitle}</h4>
      </div>
      <div className="relation-label" style={{ backgroundColor: `var(--csm-${relation})` }}>
        {relation}
      </div>
    </div>
  );
}

SectionHeader.propTypes = {
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  isStudent: PropTypes.bool.isRequired
};

export function SectionSidebar({ links }) {
  return (
    <nav id="section-detail-sidebar">
      {links.map(([label, href]) => (
        <NavLink exact to={href} key={href}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

SectionSidebar.propTypes = { links: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired };

export function SectionSpacetime({ spacetime: { location, time }, override }) {
  return (
    <InfoCard title="Time and Location">
      <h5>{location}</h5>
      <h5>{time}</h5>
      {override && (
        <React.Fragment>
          <div className="divider" />
          <div className="override-label">Adjusted for {override.date}</div>
          <h5>{override.spacetime.location}</h5>
          <h5>{override.spacetime.time}</h5>
        </React.Fragment>
      )}
    </InfoCard>
  );
}

SectionSpacetime.propTypes = {
  spacetime: SPACETIME_SHAPE.isRequired,
  override: PropTypes.shape({ spacetime: SPACETIME_SHAPE.isRequired, date: PropTypes.string.isRequired })
};

export function InfoCard({ title, children, showTitle = true }) {
  const cssClass = title.toLowerCase().replace(/ /g, "-");
  return (
    <div className={`section-detail-info-card ${cssClass}`}>
      {showTitle && <h4>{title}</h4>}
      <div className={`section-detail-info-card-contents ${cssClass}`}>{children}</div>
    </div>
  );
}

export function SectionDetail({course, courseTitle, isStudent, links, children}) {
	return (
    <section>
      <SectionHeader course={course} courseTitle={courseTitle} isStudent={isStudent} />
      <div id="section-detail-body">
        <SectionSidebar
          links={links}
        />
        <div id="section-detail-main">
					{children}
        </div>
      </div>
    </section>
	);
}

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.oneOfType([PropTypes.element, PropTypes.arrayOf(PropTypes.element)]).isRequired,
  showTitle: PropTypes.bool
};

// Values are [label, css class suffix]
export const ATTENDANCE_LABELS = Object.freeze({
  UN: ["Unexcused Absence", "unexcused"],
  EX: ["Excused Absence", "excused"],
  PR: ["Present", "present"],
  "": ["", ""]
});
