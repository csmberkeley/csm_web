import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PermissionError } from "../utils/queries/helpers";
import { useUserInfo, useUserInfoUpdateMutation } from "../utils/queries/profiles";
import ImageUploader from "./ImageUploader";
import LoadingSpinner from "./LoadingSpinner";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";

import "../css/base/form.scss";
import "../css/base/table.scss";
import "../css/profile.scss";

interface UserInfo {
  firstName: string;
  lastName: string;
  bio: string;
  pronouns: string;
  pronunciation: string;
  profileImage: string;
}

const UserProfile: React.FC = () => {
  const { id } = useParams();
  let userId = Number(id);
  const { data: currUserData, isError: isCurrUserError, isLoading: currUserIsLoading } = useUserInfo();
  const { data: requestedData, error: requestedError, isLoading: requestedIsLoading } = useUserInfo(userId);
  const updateMutation = useUserInfoUpdateMutation(userId);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<UserInfo>({
    firstName: "",
    lastName: "",
    bio: "",
    pronouns: "",
    pronunciation: "",
    profileImage: ""
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
        pronunciation: requestedData.pronunciation || "",
        profileImage: requestedData.profileImage || ""
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
    console.log("Changes");
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

  const handleCancelToggle = () => {
    setIsEditing(false);
  };

  return (
    <div className="user-profile-page">
      <div className="user-profile-main">
        <div className="user-profile-item">
          {formData.profileImage?.trim() ? <img src={formData.profileImage} /> : <LogoNoText id="logo" />}
          {isEditing && <ImageUploader />}
        </div>

        <div className="user-profile-fields">
          <div className="user-profile-wrapper">
            <div className="user-profile-form">
              <div className="user-profile-item">
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
              <div className="user-profile-item">
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
            </div>
          </div>
          <div className="user-profile-wrapper">
            <div className="user-profile-form">
              <div className="user-profile-item">
                {formData.pronunciation?.trim() && (
                  <>
                    <label htmlFor="pronunciation" className="form-label">
                      Pronunciation:
                    </label>
                    <p className="form-static">{formData.pronunciation}</p>
                  </>
                )}
                {isEditing && (
                  <>
                    <label htmlFor="pronunciation" className="form-label">
                      Pronunciation:
                    </label>
                    <input
                      type="text"
                      id="pronunciation"
                      name="pronunciation"
                      className="form-input"
                      value={formData.pronunciation}
                      onChange={handleInputChange}
                    />
                  </>
                )}
              </div>

              <div className="user-profile-item">
                {formData.pronouns?.trim() && (
                  <>
                    <label htmlFor="pronouns" className="form-label">
                      Pronouns:
                    </label>
                    <p className="form-static">{formData.pronouns}</p>
                  </>
                )}
                {isEditing && (
                  <>
                    <label htmlFor="pronouns" className="form-label">
                      Pronouns:
                    </label>
                    <input
                      type="text"
                      id="pronouns"
                      name="pronouns"
                      className="form-input"
                      value={formData.pronouns}
                      onChange={handleInputChange}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="user-profile-wrapper">
            <div className="user-profile-form">
              <div className="user-profile-item">
                <label htmlFor="email" className="form-label">
                  Email:
                </label>
                <p className="form-static">{requestedData?.email}</p>
              </div>
            </div>
          </div>

          <div className="user-profile-wrapper">
            <div className="user-profile-form">
              <div className="user-profile-item">
                {formData.bio?.trim() && (
                  <>
                    <label htmlFor="bio" className="form-label">
                      Bio:
                    </label>
                    <p className="form-static">{formData.bio}</p>
                  </>
                )}
                {isEditing && (
                  <>
                    <label htmlFor="bio" className="form-label">
                      Bio:
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      className="form-input"
                      value={formData.bio}
                      onChange={handleInputChange}
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="user-profile-wrapper">
            <div className="form-actions">
              {validationText && (
                <div className="form-validation-container">
                  <span className="form-validation-text">{validationText}</span>
                </div>
              )}
              {isCurrUser &&
                (isEditing ? (
                  <div className="user-profile-edit">
                    <button className="primary-btn" onClick={handleCancelToggle}>
                      Cancel
                    </button>
                    <button className="primary-btn" onClick={handleFormSubmit} disabled={showSaveSpinner}>
                      {showSaveSpinner ? <LoadingSpinner /> : "Save"}
                    </button>
                  </div>
                ) : (
                  <button className="primary-btn" onClick={handleEditToggle}>
                    Edit
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
