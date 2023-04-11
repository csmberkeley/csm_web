import React from "react";
import { useUserInfo } from "../utils/queries/base";
import { UserInfo } from "../utils/types";
import { userInfo } from "os";

export const UserProfile = (): React.ReactElement => {
  // const { data: profiles, isSuccess: profilesLoaded, isError: profilesLoadError } = useProfiles();
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

  // let user: Map<string, unknown> | null;
  // if (userInfoLoaded) {
  //   // loaded, no error
  //   const userById = new Map<string, unknown>();
  //   userById.set("first_name",jsonUserInfo.firstName);
  //   userById.set("last_name",jsonUserInfo.lastName);
  //   userById.set("email",jsonUserInfo.email);
  //   // const first_name = jsonUserInfo.firstName;
  //   // const last_name = jsonUserInfo.lastName;
  //   // const email = jsonUserInfo.email;
  //   user = userById;
  // } else {
  //   user = null;
  // }

  return (
    <React.Fragment>
      <div>{userInfoLoaded ? <DisplayUser userInfo={userInfo} /> : <></>}</div>
    </React.Fragment>
  );
};
// <div className="containers">
//   <h3>Profile Page:</h3>
//   <div>{user}</div>
//   <form action="" method="POST" className="profile-box">
//     <div className="profile_row">
//       <label className="profile_details">First Name: </label>
//       <input type="text" name="first_name" className="form-control" value="" required />
//     </div>
//     <div className="profile_row">
//       <label className="profile_details">Last Name: </label>
//       <input type="text" name="last_name" className="form-control" value="" required />
//     </div>
//     <div className="profile_row">
//       <label className="profile_details">Pronouns: </label>
//       <input type="text" name="pronouns" className="form-control" value="" required />
//     </div>
//     <div className="profile_row">
//       <label className="profile_details">Email: </label>
//       <input type="text" name="email" className="form-control" value="" required />
//     </div>
//     <div className="profile_row">
//       <label className="profile_details">Bio (optional): </label>
//       <input type="text" name="bio" className="form-control" value="" required />
//     </div>
//     <div className="profile_row">
//       <label className="profile_details">Pronounciation: </label>
//       <input type="text" name="pronounciation" className="form-control" value="" required />
//     </div>
//   </form>
// </div>
//   );
// };
interface UserInfoProps {
  userInfo: UserInfo | null;
}

const DisplayUser = ({ userInfo }: UserInfoProps) => {
  return (
    <div>
      {userInfo !== null ? (
        <div className="containers">
          <h3>Profile Page:</h3>
          <form action="" method="POST" className="profile-box">
            <div className="profile_row">
              <label className="profile_details">First Name: </label>
              <input
                type="text"
                name="first_name"
                className="form-control"
                value=""
                required
                placeholder={userInfo.firstName}
              />
            </div>
            <div className="profile_row">
              <label className="profile_details">Last Name: </label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                value=""
                required
                placeholder={userInfo.lastName}
              />
            </div>
            <div className="profile_row">
              <label className="profile_details">Pronouns: </label>
              <input type="text" name="pronouns" className="form-control" value="" required placeholder="" />
            </div>
            <div className="profile_row">
              <label className="profile_details">Email: </label>
              <input type="text" name="email" className="form-control" value="" required placeholder={userInfo.email} />
            </div>
            <div className="profile_row">
              <label className="profile_details">Bio (optional): </label>
              <input type="text" name="bio" className="form-control" value="" required />
            </div>
            <div className="profile_row">
              <label className="profile_details">Pronounciation: </label>
              <input type="text" name="pronounciation" className="form-control" value="" required />
            </div>
          </form>
        </div>
      ) : (
        ""
      )}
    </div>
  );
};

export default UserProfile;
