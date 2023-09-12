import React from "react";
import { useUserInfo } from "../utils/queries/base";
import { UserInfo } from "../utils/types";

import "../css/profile.scss";

export const UserProfile = (): React.ReactElement => {
  const { data: jsonUserInfo, isSuccess: userInfoLoaded } = useUserInfo();

  let userInfo: UserInfo | null;
  if (userInfoLoaded) {
    let priorityEnrollment = undefined;
    if (jsonUserInfo.priorityEnrollment) {
      priorityEnrollment = new Date(Date.parse(jsonUserInfo.priorityEnrollment));
    }
    const convertedUserInfo: UserInfo = {
      ...jsonUserInfo,
      priorityEnrollment
    };
    userInfo = convertedUserInfo;
  } else {
    // not done loading yet
    userInfo = null;
  }

  return (
    <React.Fragment>
      <div>{userInfoLoaded ? <DisplayUser userInfo={userInfo} /> : <></>}</div>
    </React.Fragment>
  );
};
interface UserInfoProps {
  userInfo: UserInfo | null;
}

const DisplayUser = ({ userInfo }: UserInfoProps) => {
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
                    placeholder={userInfo.firstName}
                    className="formbold-form-input"
                  />
                  <label className="formbold-form-label"> First name </label>
                </div>
                <div>
                  <input
                    type="text"
                    name="lastname"
                    id="lastname"
                    placeholder={userInfo.lastName}
                    className="formbold-form-input"
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
                    placeholder={userInfo.email}
                    className="formbold-form-input"
                  />
                  <label className="formbold-form-label"> Email </label>
                </div>
                <div>
                  <input type="text" name="pronouns" id="pronouns" placeholder="" className="formbold-form-input" />
                  <label className="formbold-form-label"> Pronouns </label>
                </div>
              </div>

              <div className="formbold-textarea">
                <textarea
                  name="bio"
                  id="bio"
                  placeholder="Write your bio..."
                  className="formbold-form-input"
                ></textarea>
                <label className="formbold-form-label"> Bio </label>
              </div>
              <div className="button-wrapper">
                <button className="formbold-btn">Save</button>
                <button className="formbold-btn">Edit</button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};

export default UserProfile;
