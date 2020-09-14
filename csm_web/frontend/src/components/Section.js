import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import { fetchJSON } from "../utils/api";
import { SPACETIME_SHAPE } from "../utils/types";
import StudentSection from "./StudentSection";
import MentorSection from "./MentorSection";

export const ROLES = Object.freeze({ COORDINATOR: "COORDINATOR", STUDENT: "STUDENT", MENTOR: "MENTOR" });

export default function Section({
  match: {
    url,
    params: { id }
  }
}) {
  const [{ section, loaded }, setState] = useState({ section: null, loaded: false });
  const reloadSection = () => {
    setState({ section: null, loaded: false });
    fetchJSON(`/sections/${id}`).then(section => setState({ section, loaded: true }));
  };
  useEffect(() => {
    fetchJSON(`/sections/${id}`).then(section => setState({ section, loaded: true }));
  }, [id]);
  if (!loaded) {
    return null;
  }
  switch (section.userRole) {
    case ROLES.COORDINATOR:
    case ROLES.MENTOR:
      return <MentorSection reloadSection={reloadSection} url={url} id={Number(id)} {...section} />;
    case ROLES.STUDENT:
      return <StudentSection url={url} {...section} />;
  }
}

Section.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({ id: PropTypes.string.isRequired }).isRequired,
    url: PropTypes.string.isRequired
  }).isRequired
};

export function SectionHeader({ course, courseTitle, userRole }) {
  const relation = userRole.toLowerCase();
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
  userRole: PropTypes.string.isRequired
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

const Location = ({ location }) =>
  location.match(/^https?:\/\//) ? (
    <a className="location-link" href={location}>
      Online
    </a>
  ) : (
    <h5>{location}</h5>
  );

Location.propTypes = { location: PropTypes.string.isRequired };

export function SectionSpacetime({ manySpacetimes, index, spacetime: { location, time }, override, children }) {
  return (
    <InfoCard title={`Time and Location${manySpacetimes ? ` ${index + 1}` : ""}`}>
      {children}
      <Location location={location} />
      <h5>{time}</h5>
      {override && (
        <React.Fragment>
          <div className="divider" />
          <div className="override-label">Adjusted for {override.date}</div>
          <Location location={override.spacetime.location} />
          <h5>{override.spacetime.time}</h5>
        </React.Fragment>
      )}
    </InfoCard>
  );
}

SectionSpacetime.propTypes = {
  spacetime: SPACETIME_SHAPE.isRequired,
  override: PropTypes.shape({ spacetime: SPACETIME_SHAPE.isRequired, date: PropTypes.string.isRequired }),
  children: PropTypes.node,
  manySpacetimes: PropTypes.bool.isRequired,
  index: PropTypes.number.isRequired // 0-indexed in code, displayed 1-indexed to user
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

InfoCard.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  showTitle: PropTypes.bool
};

export function SectionDetail({ course, courseTitle, userRole, links, children }) {
  return (
    <section>
      <SectionHeader course={course} courseTitle={courseTitle} userRole={userRole} />
      <div id="section-detail-body">
        <SectionSidebar links={links} />
        <div id="section-detail-main">{children}</div>
      </div>
    </section>
  );
}

SectionDetail.propTypes = {
  course: PropTypes.string.isRequired,
  courseTitle: PropTypes.string.isRequired,
  userRole: PropTypes.string.isRequired,
  links: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.string)).isRequired,
  children: PropTypes.node.isRequired
};

// Values are [label, css class suffix]
export const ATTENDANCE_LABELS = Object.freeze({
  UN: ["Unexcused Absence", "unexcused"],
  EX: ["Excused Absence", "excused"],
  PR: ["Present", "present"],
  "": ["", ""]
});
