import React, { useEffect, useState } from "react";
import { fetchJSON, HTTP_METHODS } from "../utils/api";
import { fetchWithMethod } from "../utils/api";

interface UserInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  subscribed: boolean;
  priorityEnrollment?: Date;
}

export const Profile = () => {
  const [userInfo, setUserInfo] = useState<UserInfo>();

  const loadUser = () => {
    fetchJSON("/userinfo").then(userInfo => {
      let priorityEnrollment = null;
      if (userInfo.priorityEnrollment) {
        priorityEnrollment = new Date(Date.parse(userInfo.priorityEnrollment));
      }

      const convertedUserInfo: UserInfo = {
        ...userInfo,
        priorityEnrollment
      };
      setUserInfo(convertedUserInfo);
    });
  };

  useEffect(loadUser, []);

  return (
    <div className="profile-page">
      <button
        className="csm-btn subscription-btn"
        style={{ backgroundColor: `var(--csm-${userInfo?.subscribed ? "danger" : "green"})` }}
        onClick={() => {
          fetchWithMethod(`/users/${userInfo?.id}/email`, HTTP_METHODS.PUT).then(loadUser);
        }}
      >
        {userInfo?.subscribed ? "Unsubscribe" : "Subscribe"}
      </button>
    </div>
  );
};
