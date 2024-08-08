import React from "react";
import { useParams } from "react-router-dom";
import { useUser } from "../utils/queries/user";
import LoadingSpinner from "./LoadingSpinner";
import "../css/base/form.scss"; // Import the base.scss file for styling
import "../css/base/table.scss";

const UserProfile: React.FC = () => {
  const { id } = useParams(); // Type the id parameter
  const { data, error, isLoading } = useUser(Number(id));

  // Handle loading and error states
  if (isLoading) {
    return <LoadingSpinner className="spinner-centered" />;
  }
  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="csm-form">
      <h2>User Profile</h2>
      <form>
        <div className="form-label">
          <label htmlFor="firstName">First Name:</label>
          <p id="firstName" className="form-input">
            {data?.firstName}
          </p>
        </div>
        <div className="form-label">
          <label htmlFor="lastName">Last Name:</label>
          <p id="lastName" className="form-input">
            {data?.lastName}
          </p>
        </div>
        <div className="form-label">
          <label htmlFor="email">Email:</label>
          <p id="email" className="form-input">
            {data?.email}
          </p>
        </div>
        <div className="form-label">
          <label htmlFor="bio">Bio:</label>
          <p id="bio" className="form-input">
            {data?.bio || "N/A"}
          </p>
        </div>
        <div className="form-label">
          <label htmlFor="pronouns">Pronouns:</label>
          <p id="pronouns" className="form-input">
            {data?.pronouns || "N/A"}
          </p>
        </div>
        <div className="form-label">
          <label htmlFor="pronunciation">Pronunciation:</label>
          <p id="pronunciation" className="form-input">
            {data?.pronunciation || "N/A"}
          </p>
        </div>
        <div className="form-actions">
          <button type="button" className="form-select" onClick={() => console.log("Edit profile")}>
            Edit
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserProfile;
