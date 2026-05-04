import React from "react";
import { NavLink, useParams } from "react-router-dom";

import { formatSpacetimeInterval } from "../../utils/datetime";
import { useSection } from "../../utils/queries/sections";
import { Override, Role, Spacetime } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
import MentorSection from "./MentorSection";
import { WaitlistStudentSection, StudentSection } from "./StudentSection";

import scssColors from "../../css/base/colors-export.module.scss";
import "../../css/section.scss";

export default function Section(): React.ReactElement | null {
  const { id } = useParams();

  const { data: section, isSuccess: sectionLoaded, isError: sectionLoadError } = useSection(Number(id));

  if (!sectionLoaded) {
    if (sectionLoadError) {
      return <h3>Section not found</h3>;
    }
    return <LoadingSpinner className="spinner-centered" />;
  }
  console.log(section);
  switch (section.userRole) {
    case Role.COORDINATOR:
    case Role.MENTOR:
      return <MentorSection {...section} />;
    case Role.STUDENT:
      return <StudentSection {...section} />;
    case Role.WAITLIST:
      return <WaitlistStudentSection {...section} />;
    default:
      return null;
  }
}

interface SectionHeaderProps {
  course: string;
  courseTitle: string;
  userRole: string;
}

export function SectionHeader({ course, courseTitle, userRole }: SectionHeaderProps) {
  const relation = userRole.toLowerCase();
  const relationColor = scssColors[relation];
  return (
    <div className="section-detail-header">
      <div className="section-detail-header-title">
        <h3>{course}</h3>
        <h4>{courseTitle}</h4>
      </div>
      <div className="relation-label" style={{ backgroundColor: relationColor }}>
        {relation}
      </div>
    </div>
  );
}

interface SectionSidebarProps {
  links: string[][];
}

export function SectionSidebar({ links }: SectionSidebarProps) {
  return (
    <nav id="section-detail-sidebar">
      {links.map(([label, href]) => (
        <NavLink end to={`${href}`} key={href}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

interface LocationProps {
  location?: string;
}

function Location({ location }: LocationProps) {
  return (location || "").match(/^https?:\/\//) ? (
    <a className="location-link" href={location}>
      Online
    </a>
  ) : (
    <h5>{location}</h5>
  );
}

interface SectionSpacetimeProps {
  manySpacetimes: boolean;
  index: number;
  children?: React.ReactNode;
  spacetime: Spacetime;
  override?: Override;
  spacetimeActions?: React.ReactNode;
  overrideActions?: React.ReactNode;
}

export function SectionSpacetime({
  manySpacetimes,
  index,
  spacetime,
  override,
  spacetimeActions,
  overrideActions,
  children
}: SectionSpacetimeProps) {
  const location = spacetime.location;
  return (
    <InfoCard title={`Time and Location${manySpacetimes ? ` ${index + 1}` : ""}`}>
      {spacetimeActions}
      {children}
      <Location location={location} />
      <h5>{formatSpacetimeInterval(spacetime)}</h5>
      {override && (
        <React.Fragment>
          <div className="divider" />
          {overrideActions}
          <div className="override-label">Adjusted for {override.date}</div>
          <Location location={override.spacetime.location} />
          <h5>{formatSpacetimeInterval(override.spacetime)}</h5>
        </React.Fragment>
      )}
    </InfoCard>
  );
}

interface InfoCardProps {
  title: string;
  children?: React.ReactNode;
  showTitle?: boolean;
  extraPadding?: boolean;
}

export function InfoCard({ title, children, showTitle = true, extraPadding = true }: InfoCardProps) {
  const cssClass = title.toLowerCase().replace(/ /g, "-");
  return (
    <div className={`section-detail-info-card ${cssClass}`}>
      {showTitle && <h2>{title}</h2>}
      <div className={`section-detail-info-card-contents ${extraPadding ? "padded-card" : ""} ${cssClass}`}>
        {children}
      </div>
    </div>
  );
}

interface SectionDetailProps {
  course: string;
  courseTitle: string;
  userRole: string;
  links: string[][];
  children?: React.ReactNode;
}
export function SectionDetail({ course, courseTitle, userRole, links, children }: SectionDetailProps) {
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

// Values are [label, css class suffix]
export const ATTENDANCE_LABELS: Readonly<{ [label: string]: string[] }> = Object.freeze({
  EX: ["Excused Absence", "excused"],
  PR: ["Present", "present"],
  UN: ["Unexcused Absence", "unexcused"],
  "": ["", ""]
});
