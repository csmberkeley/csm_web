import React, { useState } from "react";
import { useUserInfo } from "../utils/queries/base";
import { RawUserInfo, UserInfo } from "../utils/types";
import { useUserInfoUpdateMutation } from "../utils/queries/profiles";
import { DateTime } from "luxon";

import "../css/profile.scss";

export const UserProfile = (): React.ReactElement => {
  const { data: jsonUserInfo, isSuccess: userInfoLoaded } = useUserInfo();

  // let userInfo: UserInfo;
  // if (userInfoLoaded) {
  //   let priorityEnrollment = undefined;
  //   if (jsonUserInfo.priorityEnrollment) {
  //     priorityEnrollment = DateTime.fromISO(jsonUserInfo.priorityEnrollment);
  //   }
  //   const convertedUserInfo: UserInfo = {
  //     ...jsonUserInfo,
  //     priorityEnrollment
  //   };
  //   userInfo = convertedUserInfo;
  // }
  // else {
  //   // not done loading yet
  //   userInfo = null;
  // }

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
  const [userFirstName, setUserFirstName] = useState<string>("");

  /**
   * User Last Name
   */
  const [userLastName, setUserLastName] = useState<string>("");
  /**
   * User email
   */
  const [userEmail, setUserEmail] = useState<string>("");
  /**
   * User Pronoun
   */
  const [userPronoun, setUserPronoun] = useState<string>("");
  /**
   * User Bio
   */
  const [bio, setBio] = useState<string>("");
  /**
   * Pronunciation
   */
  const [pronunciation, setPronunciation] = useState<string>("");
  /**
   * Pronunciation
   */
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
      bio,
      priorityEnrollment: priority,
      pronouns: userPronoun,
      pronunciation
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
      case "firstName":
        setUserFirstName(value);
        break;
      case "lastName":
        setUserLastName(value);
        break;
      case "email":
        setUserEmail(value);
        break;
      case "pronouns":
        setUserPronoun(value);
        break;
      case "bio":
        setBio(value);
        break;
      case "pronunciation":
        setPronunciation(value);
        break;
      default:
        console.error("Unknown input name: " + name);
        break;
    }
  };

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
                    disabled={!editing}
                    onChange={e => handleChange("firstName", e.target.value)}
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
                    disabled={!editing}
                    onChange={e => handleChange("lastName", e.target.value)}
                  />
                  <label className="formbold-form-label"> Last name </label>
                </div>
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
                    onChange={e => handleChange("email", e.target.value)}
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
                    onChange={e => handleChange("pronouns", e.target.value)}
                  />
                  <label className="formbold-form-label"> Pronouns </label>
                </div>
              </div>
              <div className="formbold-textarea">
                <textarea
                  name="pronunciation"
                  id="pronunciation"
                  placeholder="How to pronounce your name"
                  className="formbold-form-input"
                  disabled={true}
                ></textarea>
                <label className="formbold-form-label"> Pronunciation </label>
              </div>
              <div className="formbold-textarea">
                <textarea
                  name="bio"
                  id="bio"
                  placeholder="Write your bio..."
                  className="formbold-form-input"
                  disabled={!editing}
                  defaultValue={userInfo.bio}
                  onChange={e => handleChange("bio", e.target.value)}
                ></textarea>
                <label className="formbold-form-label"> Bio </label>
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
