import React from "react";

export const UserProfile = (): React.ReactElement => {
  return (
    <div className="containers">
      <h3>Profile Page:</h3>
      <form action="" method="POST" className="profile-box">
        <div className="profile_row">
          <label className="profile_details">First Name: </label>
          <input type="text" name="first_name" className="form-control" value="" required />
        </div>
        <div className="profile_row">
          <label className="profile_details">Last Name: </label>
          <input type="text" name="last_name" className="form-control" value="" required />
        </div>
        <div className="profile_row">
          <label className="profile_details">Pronouns: </label>
          <input type="text" name="pronouns" className="form-control" value="" required />
        </div>
        <div className="profile_row">
          <label className="profile_details">Email: </label>
          <input type="text" name="email" className="form-control" value="" required />
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
  );
};

export default UserProfile;
