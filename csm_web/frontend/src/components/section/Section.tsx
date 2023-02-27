import React from "react";
import { NavLink, useParams } from "react-router-dom";
import StudentSection from "./StudentSection";
import MentorSection from "./MentorSection";
import { Override, Spacetime } from "../../utils/types";
import { useSection } from "../../utils/queries/sections";
import LoadingSpinner from "../LoadingSpinner";

export const ROLES = Object.freeze({ COORDINATOR: "COORDINATOR", STUDENT: "STUDENT", MENTOR: "MENTOR" });

export default function Section(): React.ReactElement | null {
  const { id } = useParams();

  const { data: section, isSuccess: sectionLoaded, isError: sectionLoadError } = useSection(Number(id));

  if (!sectionLoaded) {
    if (sectionLoadError) {
      return <h3>Section not found</h3>;
    }
    return <LoadingSpinner className="spinner-centered" />;
  }

  switch (section.userRole) {
    case ROLES.COORDINATOR:
    case ROLES.MENTOR:
      return <MentorSection {...section} />;
    case ROLES.STUDENT:
      return <StudentSection {...section} />;
  }
  return null;
}

interface SectionHeaderProps {
  course: string;
  courseTitle: string;
  userRole: string;
}

export function SectionHeader({ course, courseTitle, userRole }: SectionHeaderProps) {
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

interface SectionSidebarProps {
  links: string[][];
}

export function SectionSidebar({ links }: SectionSidebarProps) {
  return (
    <nav id="section-detail-sidebar">
      {links.map(([label, href]) => (
        <NavLink end to={href} key={href}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export function SectionSwapbar() {
  return (
    <div>Hi</div>
    // <nav id="section-swap-sidebar">
    //   {links.map(([label, href]) => (
    //     <NavLink end to={href} key={href}>
    //       {label}
    //     </NavLink>
    //   ))}
    // </nav>
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
}

export function SectionSpacetime({
  manySpacetimes,
  index,
  spacetime: { location, time },
  override,
  children
}: SectionSpacetimeProps) {
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

interface InfoCardProps {
  title: string;
  children?: React.ReactNode;
  showTitle?: boolean;
}

export function InfoCard({ title, children, showTitle = true }: InfoCardProps) {
  const cssClass = title.toLowerCase().replace(/ /g, "-");
  return (
    <div className={`section-detail-info-card ${cssClass}`}>
      {showTitle && <h4>{title}</h4>}
      <div className={`section-detail-info-card-contents ${cssClass}`}>{children}</div>
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
        <div id="dev">
          <SectionSwapbar />
        </div>
        <div id="section-detail-main">{children}</div>
      </div>
    </section>
  );
}

// Values are [label, css class suffix]
export const ATTENDANCE_LABELS: Readonly<{ [label: string]: string[] }> = Object.freeze({
  UN: ["Unexcused Absence", "unexcused"],
  EX: ["Excused Absence", "excused"],
  PR: ["Present", "present"],
  "": ["", ""]
});
