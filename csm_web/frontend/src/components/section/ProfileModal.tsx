import React, { useState } from "react";
import LoadingSpinner from "../LoadingSpinner";
import Modal from "../Modal";
import { useUserInfo } from "../../utils/queries/base";
import { UserInfo } from "../../utils/types";

interface ProfileModalProps {
  closeModal: () => void;
}

const ProfileModal = ({ closeModal }: ProfileModalProps): React.ReactElement => {
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
    <Modal className="spacetime-edit-modal" closeModal={closeModal}>
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
                      disabled={true}
                    />
                    <label className="formbold-form-label"> Pronouns </label>
                  </div>
                </div>

                <div className="formbold-textarea">
                  <textarea
                    name="bio"
                    id="bio"
                    placeholder="Write your bio..."
                    className="formbold-form-input"
                    disabled={true}
                  ></textarea>
                  <label className="formbold-form-label"> Bio </label>
                </div>
              </form>
              <div className="button-wrapper"></div>
            </div>
          </div>
        ) : (
          ""
        )}
      </div>
    </Modal>
  );
};

export default ProfileModal;
