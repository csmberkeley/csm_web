import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PermissionError } from "../utils/queries/helpers";
import { useUserInfo, useUserInfoUpdateMutation } from "../utils/queries/profiles";
import { RawUserInfo } from "../utils/types";
// import ImageUploader from "./ImageUploader";
import LoadingSpinner from "./LoadingSpinner";
// import { Tooltip } from "./Tooltip";
// import InfoIcon from "../../static/frontend/img/info.svg";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";

import "../css/base/form.scss";
import "../css/base/table.scss";
import "../css/profile.scss";

const UserProfile: React.FC = () => {
  let userId = Number(useParams().id);

  // We always need to get the current user and the viewed profile to check if the current profile page being viewed is the current user (and therefore editable)
  const { data: currUserData, isError: isCurrUserError, isLoading: currUserIsLoading } = useUserInfo();
  const { data: requestedData, error: requestedError, isLoading: requestedIsLoading } = useUserInfo(userId);

  const updateMutation = useUserInfoUpdateMutation();

  const [viewing, setViewing] = useState(true);
  const [showSaveSpinner, setShowSaveSpinner] = useState(false);
  // const [validationText, setValidationText] = useState("");

  const [formData, setFormData] = useState<Partial<RawUserInfo>>({
    firstName: "",
    lastName: "",
    preferredName: "",
    bio: "",
    pronouns: "",
    pronunciation: "",
    profileImage: ""
  });

  // Populate form data with fetched user data
  useEffect(() => {
    if (requestedData) {
      setFormData({
        firstName: requestedData.firstName || "",
        lastName: requestedData.lastName || "",
        preferredName: requestedData.preferredName || "",
        bio: requestedData.bio || "",
        pronouns: requestedData.pronouns || "",
        pronunciation: requestedData.pronunciation || "",
        profileImage: requestedData.profileImage || ""
      });
    }
  }, [requestedData]);

  // If loading, return loading spinner
  if (requestedIsLoading || currUserIsLoading) {
    return <LoadingSpinner className="spinner-centered" />;
  }

  // If error, state error
  if (requestedError || isCurrUserError) {
    if (requestedError instanceof PermissionError) {
      return <h3>Permission Denied</h3>;
    } else {
      return <h3>Failed to fetch user data</h3>;
    }
  }

  // Update current user ID when known
  if (Number.isNaN(userId) && requestedData) {
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

  // // Validate current form data
  // const validateFormData = (): boolean => {
  //   if (!formData.firstName || !formData.lastName) {
  //     setValidationText("First and last names must be specified.");
  //     return false;
  //   }

  //   setValidationText("");
  //   return true;
  // };

  // Handle form submission
  const handleFormSubmit = () => {
    // if (!validateFormData()) {
    //   return;
    // }

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
          setViewing(true); // Exit edit mode after successful save
          console.log("Profile updated successfully");
          setShowSaveSpinner(false);
        },
        onError: () => {
          // setValidationText("Error occurred on save.");
          setShowSaveSpinner(false);
        }
      }
    );
  };

  // Check if page is editable (current user matches viewed profile)
  const canEdit = currUserData?.id === requestedData?.id || requestedData.isEditable;

  // Toggle edit mode
  const handleEditToggle = () => {
    setViewing(false);
  };

  const handleCancelToggle = () => {
    setViewing(true);
  };

  return (
    <div className="user-profile-page">
      <div className="user-profile-main">
        {viewing ? (
          <>
            <div className="user-profile-viewing-header">
              <div className="user-profile-item user-profile-image-container">
                {formData.profileImage?.trim() ? <img src={formData.profileImage} /> : <LogoNoText id="logo" />}
              </div>
              <div className="user-profile-fields">
                <div className="user-profile-item">
                  <p className="user-profile-text user-profile-name">
                    {formData.preferredName}
                    {formData.pronouns?.trim() && (
                      <>
                        &nbsp;
                        <small>[{formData.pronouns.toLowerCase()}]</small>
                      </>
                    )}
                  </p>
                </div>

                <div className="user-profile-item">
                  {formData.pronunciation?.trim() && (
                    <>
                      <p className="user-profile-text user-profile-pronunciation">{formData.pronunciation}</p>
                    </>
                  )}
                </div>

                <div className="user-profile-item">
                  <p className="user-profile-text user-profile-email">{requestedData?.email}</p>
                </div>
              </div>
            </div>
            <div className="user-profile-bio">
              {formData.bio?.trim() && <p className="form-static">{formData.bio}</p>}
            </div>

            <div className="form-actions">
              {canEdit && (
                <button className="primary-btn" onClick={handleEditToggle}>
                  Edit
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="user-profile-item user-profile-image-container">
              {formData.profileImage?.trim() ? <img src={formData.profileImage} /> : <LogoNoText id="logo" />}
            </div>
            <div className="user-profile-input user-profile-name-label">
              <label htmlFor="preferredName" className="form-label user-profile-name-label">
                Preferred&nbsp;Name&nbsp;
              </label>
              {/* <Tooltip placement="top" source={<InfoIcon className="icon" />}>
              <div>
                A blank name field will default to
                <br />the user's first and last name.
              </div>
            </Tooltip> */}
              <input
                type="text"
                id="preferredName"
                name="preferredName"
                className="form-input user-profile-input-field"
                value={formData.preferredName}
                onChange={handleInputChange}
              />
            </div>
            <div className="user-profile-input">
              <label htmlFor="pronouns" className="form-label">
                Pronouns&nbsp;
              </label>
              <input
                type="text"
                id="pronouns"
                name="pronouns"
                className="form-input user-profile-input-field"
                value={formData.pronouns}
                onChange={handleInputChange}
              />
            </div>
            <div className="user-profile-input">
              <label htmlFor="pronunciation" className="form-label">
                Pronunciation&nbsp;
              </label>
              <input
                type="text"
                id="pronunciation"
                name="pronunciation"
                className="form-input user-profile-input-field"
                value={formData.pronunciation}
                onChange={handleInputChange}
              />
            </div>
            <div className="user-profile-input">
              <label htmlFor="email" className="form-label">
                Email&nbsp;
              </label>
              <input
                type="text"
                id="email"
                name="email"
                className="form-input user-profile-input-field"
                value={requestedData?.email}
                disabled
              />
            </div>
            <div className="user-profile-bio-container">
              <label htmlFor="bio" className="form-label">
                Bio
              </label>
              <textarea
                id="bio"
                name="bio"
                className="form-input user-profile-bio-input"
                value={formData.bio}
                onChange={handleInputChange}
              />
            </div>
            <div className="user-profile-buttons">
              <button className="primary-btn" onClick={handleCancelToggle}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleFormSubmit} disabled={showSaveSpinner}>
                {showSaveSpinner ? <LoadingSpinner /> : "Save"}
              </button>
            </div>
            {/* <div className="user-profile-item">
            {formData.profileImage?.trim() ? <img src={formData.profileImage} /> : <LogoNoText id="logo" />}
            {viewing && <ImageUploader />}
          </div>

          <div className="user-profile-fields">
            <div className="user-profile-wrapper">
              <div className="user-profile-form">
                <div className="user-profile-item">
                  <label htmlFor="firstName" className="form-label">
                    First Name:
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    className="form-input"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="user-profile-item">
                  <label htmlFor="lastName" className="form-label">
                    Last Name:
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    className="form-input"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                  />
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
                {canEdit &&
                  (viewing ? (
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
          </div> */}
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
