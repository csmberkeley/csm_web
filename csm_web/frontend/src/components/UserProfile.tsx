import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PermissionError } from "../utils/queries/helpers";
import { useUserInfo, useUserInfoUpdateMutation } from "../utils/queries/profiles";
import LoadingSpinner from "./LoadingSpinner";

import "../css/base/form.scss";
import "../css/base/table.scss";

const UserProfile: React.FC = () => {
  const { id } = useParams();
  let userId = Number(id);
  const { data: currUserData, isError: isCurrUserError, isLoading: currUserIsLoading } = useUserInfo();
  const { data: requestedData, error: requestedError, isLoading: requestedIsLoading } = useUserInfo(userId);
  const updateMutation = useUserInfoUpdateMutation(userId);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    pronouns: "",
    pronunciation: ""
  });

  const [showSaveSpinner, setShowSaveSpinner] = useState(false);
  const [validationText, setValidationText] = useState("");

  // Populate form data with fetched user data
  useEffect(() => {
    if (requestedData) {
      setFormData({
        firstName: requestedData.firstName || "",
        lastName: requestedData.lastName || "",
        bio: requestedData.bio || "",
        pronouns: requestedData.pronouns || "",
        pronunciation: requestedData.pronunciation || ""
      });
    }
  }, [requestedData]);

  if (requestedIsLoading || currUserIsLoading) {
    return <LoadingSpinner className="spinner-centered" />;
  }

  if (requestedError || isCurrUserError) {
    if (requestedError instanceof PermissionError) {
      return <h3>Permission Denied</h3>;
    } else {
      return <h3>Failed to fetch user data</h3>;
    }
  }

  if (id === undefined && requestedData) {
    userId = requestedData.id;
  }

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate current form data
  const validateFormData = (): boolean => {
    if (!formData.firstName || !formData.lastName) {
      setValidationText("First and last names must be specified.");
      return false;
    }

    setValidationText("");
    return true;
  };

  // Handle form submission
  const handleFormSubmit = () => {
    if (!validateFormData()) {
      return;
    }

    setShowSaveSpinner(true);

    updateMutation.mutate(
      {
        id: userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        pronouns: formData.pronouns,
        pronunciation: formData.pronunciation
      },
      {
        onSuccess: () => {
          setIsEditing(false); // Exit edit mode after successful save
          console.log("Profile updated successfully");
          setShowSaveSpinner(false);
        },
        onError: () => {
          setValidationText("Error occurred on save.");
          setShowSaveSpinner(false);
        }
      }
    );
  };

  const isCurrUser = currUserData?.id === requestedData?.id || requestedData.isEditable;

  // Toggle edit mode
  const handleEditToggle = () => {
    setIsEditing(true);
  };

  return (
    <div id="user-profile-form">
      <h2 className="form-title">User Profile</h2>
      <div className="csm-form">
        <div className="form-item">
          <label htmlFor="firstName" className="form-label">
            First Name:
          </label>
          {isEditing ? (
            <input
              type="text"
              id="firstName"
              name="firstName"
              className="form-input"
              value={formData.firstName}
              onChange={handleInputChange}
              required
            />
          ) : (
            <p className="form-static">{formData.firstName}</p>
          )}
        </div>
        <div className="form-item">
          <label htmlFor="lastName" className="form-label">
            Last Name:
          </label>
          {isEditing ? (
            <input
              type="text"
              id="lastName"
              name="lastName"
              className="form-input"
              value={formData.lastName}
              onChange={handleInputChange}
              required
            />
          ) : (
            <p className="form-static">{formData.lastName}</p>
          )}
        </div>
        <div className="form-item">
          <label htmlFor="pronunciation" className="form-label">
            Pronunciation:
          </label>
          {isEditing ? (
            <input
              type="text"
              id="pronunciation"
              name="pronunciation"
              className="form-input"
              value={formData.pronunciation}
              onChange={handleInputChange}
            />
          ) : (
            <p className="form-static">{formData.pronunciation}</p>
          )}
        </div>
        <div className="form-item">
          <label htmlFor="pronouns" className="form-label">
            Pronouns:
          </label>
          {isEditing ? (
            <input
              type="text"
              id="pronouns"
              name="pronouns"
              className="form-input"
              value={formData.pronouns}
              onChange={handleInputChange}
            />
          ) : (
            <p className="form-static">{formData.pronouns}</p>
          )}
        </div>
        <div className="form-item">
          <label htmlFor="email" className="form-label">
            Email:
          </label>
          <p className="form-static">{requestedData?.email}</p>
        </div>
        <div className="form-item">
          <label htmlFor="bio" className="form-label">
            Bio:
          </label>
          {isEditing ? (
            <textarea id="bio" name="bio" className="form-input" value={formData.bio} onChange={handleInputChange} />
          ) : (
            <p className="form-static">{formData.bio}</p>
          )}
        </div>
        <div className="form-actions">
          {validationText && (
            <div className="form-validation-container">
              <span className="form-validation-text">{validationText}</span>
            </div>
          )}
          {isCurrUser &&
            (isEditing ? (
              <button className="primary-btn" onClick={handleFormSubmit} disabled={showSaveSpinner}>
                {showSaveSpinner ? <LoadingSpinner /> : "Save"}
              </button>
            ) : (
              <button className="primary-btn" onClick={handleEditToggle}>
                Edit
              </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
