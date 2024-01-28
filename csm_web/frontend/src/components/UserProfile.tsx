import { DateTime } from "luxon";
import React, { useState } from "react";
import { useUserInfo } from "../utils/queries/base";
import { useUserInfoUpdateMutation } from "../utils/queries/profiles";
import { RawUserInfo } from "../utils/types";

import "../css/profile.scss";

export const UserProfile = (): React.ReactElement => {
  const { data: jsonUserInfo, isSuccess: userInfoLoaded } = useUserInfo();

  return (
    <React.Fragment>
      <div>
        {userInfoLoaded ? (
          <DisplayUser userInfo={jsonUserInfo} priorityEnrollment={jsonUserInfo.priorityEnrollment} />
        ) : (
          <></>
        )}
      </div>
    </React.Fragment>
  );
};

interface UserInfoProps {
  userInfo: RawUserInfo;
  priorityEnrollment?: string;
}

const DisplayUser = ({ userInfo, priorityEnrollment }: UserInfoProps) => {
  /**
   * Mutation to create a new section.
   */
  const createSectionMutation = useUserInfoUpdateMutation(userInfo?.id);

  const [editing, setEditing] = useState(false);
  /**
   * User First Name
   */
  const userFirstName = userInfo.firstName;

  /**
   * User Last Name
   */

  const userLastName = userInfo.lastName;
  /**
   * User email
   */
  const userEmail = userInfo.email;
  /**
   * User Pronoun
   */
  const [userPronoun, setUserPronoun] = useState<string>(userInfo.pronouns);
  /**
   * User Bio
   */
  const [userBio, setUserBio] = useState<string>(userInfo.bio);
  /**
   * Pronunciation
   */
  const [userPreferredName, setUserPreferredName] = useState<string>(userInfo.pronunciation);

  const CHARACTER_LIMIT = 500;

  let priority: DateTime | undefined;
  if (priorityEnrollment) {
    priority = DateTime.fromISO(priorityEnrollment);
  }

  const handleEditing = () => {
    setEditing(true);
  };

  const handleCancel = () => {
    // Reset form data if necessary
    setEditing(false);
  };

  /**
   * Handle save.
   */
  const handleSave = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    const data = {
      id: userInfo.id,
      firstName: userFirstName,
      lastName: userLastName,
      email: userEmail,
      isPrivate: userInfo.isPrivate,
      bio: userBio,
      priorityEnrollment: priority,
      pronouns: userPronoun,
      pronunciation: userPreferredName
    };
    console.log(data);
    createSectionMutation.mutate(data, {
      onSuccess: () => {
        setEditing(false);
      }
    });
  };

  /**
   * Handle the change of a form field.
   */
  const handleChange = (name: string, value: string): void => {
    switch (name) {
      case "pronouns":
        setUserPronoun(value);
        break;
      case "bio":
        setUserBio(value);
        break;
      case "preferredName":
        setUserPreferredName(value);
        break;
      default:
        console.error("Unknown input name: " + name);
        break;
    }
  };

  // const handleBio = (value: string): void => {
  //   setUserBio()
  // }

  return (
    <div>
      {userInfo !== null ? (
        <div className="formbold-main-wrapper">
          <div className="formbold-form-wrapper">
            <form action="" method="POST">
              <div className="formbold-input-flex">
                <div>
                  <input
                    type="text"
                    name="firstname"
                    id="firstname"
                    defaultValue={userInfo.firstName}
                    className="formbold-form-input"
                    disabled={true}
                  />
                  <label className="formbold-form-label"> First name </label>
                </div>
                <div>
                  <input
                    type="text"
                    name="lastname"
                    id="lastname"
                    defaultValue={userInfo.lastName}
                    className="formbold-form-input"
                    disabled={true}
                  />
                  <label className="formbold-form-label"> Last name </label>
                </div>
              </div>
              <div className="formbold-textarea">
                <textarea
                  name="bio"
                  id="bio"
                  placeholder="Write your bio..."
                  className="formbold-form-input-bio"
                  disabled={!editing}
                  defaultValue={userInfo.bio}
                  maxLength={500}
                  onChange={e => handleChange("bio", e.target.value)}
                ></textarea>
                <label className="formbold-form-label"> Bio {`[${userBio.length} / ${CHARACTER_LIMIT}]`}</label>
              </div>
              <div className="formbold-input-flex">
                <div>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    defaultValue={userInfo.email}
                    className="formbold-form-input"
                    disabled={true}
                  />
                  <label className="formbold-form-label"> Email </label>
                </div>
                <div>
                  <input
                    type="text"
                    name="pronouns"
                    id="pronouns"
                    placeholder=""
                    className="formbold-form-input"
                    defaultValue={userInfo.pronouns}
                    disabled={!editing}
                    maxLength={20}
                    onChange={e => handleChange("pronouns", e.target.value)}
                  />
                  <label className="formbold-form-label"> Pronouns </label>
                </div>
              </div>
              <div className="formbold-textarea">
                <textarea
                  name="preferredName"
                  id="preferredName"
                  placeholder=""
                  className="formbold-form-input"
                  disabled={!editing}
                  defaultValue={userInfo.pronunciation}
                  maxLength={50}
                  onChange={e => handleChange("preferredName", e.target.value)}
                ></textarea>
                <label className="formbold-form-label"> Preferred Name </label>
              </div>
            </form>
            <div className="button-wrapper">
              <>
                {!editing ? (
                  <button className="formbold-btn" onClick={handleEditing}>
                    Edit
                  </button>
                ) : (
                  <>
                    <button className="formbold-btn" onClick={handleSave}>
                      Save
                    </button>
                    <button className="formbold-btn" onClick={handleCancel}>
                      Cancel
                    </button>
                  </>
                )}
              </>
            </div>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};

export default UserProfile;
