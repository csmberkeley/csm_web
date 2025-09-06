import React from "react";
import { Link } from "react-router-dom";
import { formatSpacetimeInterval } from "../../utils/datetime";
import { RawUserInfo, Spacetime } from "../../utils/types";
import ClockIcon from "../../../static/frontend/img/clock.svg";
import LogoNoText from "../../../static/frontend/img/logo_no_text.svg";

interface BioEntryProps {
  user: RawUserInfo;
  sectionTimes: Spacetime[][];
}

const BioEntry = ({ user, sectionTimes }: BioEntryProps) => {
  return (
    <div key={user.id} className="profile-container">
      <Link to={`/profile/${user.id}`}>
        <div className={"profile-item profile-image-container" + (user.profileImage?.trim() ? "" : " profile-border")}>
          {user.profileImage?.trim() ? (
            <img src={user.profileImage} className="profile-image" />
          ) : (
            <LogoNoText id="logo" className="profile-image profile-placeholder" />
          )}
        </div>
      </Link>
      <div className="profile-info">
        <div className="profile-item">
          <p className="profile-text profile-name">
            {user.preferredName}
            {user.pronouns.trim() && (
              <>
                &nbsp;
                <small>[{user.pronouns.toLowerCase()}]</small>
              </>
            )}
          </p>
        </div>

        <div className="profile-item">
          {user.pronunciation.trim() && (
            <>
              <p className="profile-text profile-pronunciation">{user.pronunciation}</p>
            </>
          )}
        </div>

        <div className="profile-item">
          <p className="profile-text profile-email">{user.email}</p>
        </div>

        <div className="profile-section-times">
          {sectionTimes.map((spacetimes, index) => (
            <div key={index} className="profile-section-time">
              <ClockIcon /> <span>{spacetimes.map(formatSpacetimeInterval).join(" + ")}</span>
            </div>
          ))}
        </div>
        {user.bio.trim() && <p>{user.bio}</p>}
      </div>
    </div>
  );
};
export default BioEntry;
