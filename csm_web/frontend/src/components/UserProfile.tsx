import React, { useState } from "react";
import { Routes, Route, useParams } from "react-router-dom";
import { PermissionError } from "../utils/queries/helpers";
import { UpdateUserMutationResponse, useUserInfo, useUserInfoUpdateMutation } from "../utils/queries/profiles";
import LoadingSpinner from "./LoadingSpinner";
import { Tooltip } from "./Tooltip";
import ExclamationCircle from "../../static/frontend/img/exclamation-circle.svg";
import InfoIcon from "../../static/frontend/img/info.svg";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";
import Upload from "../../static/frontend/img/upload.svg";
import XIcon from "../../static/frontend/img/x.svg";

import "../css/base/form.scss";
import "../css/base/table.scss";
import "../css/profile.scss";

export interface FormUserInfo {
  preferredName: string;
  bio: string;
  pronouns: string;
  pronunciation: string;
  profileImage: string;
}

const MAX_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const UserProfile: React.FC = () => {
  return (
    <Routes>
      <Route path=":id/*" element={<UserProfileContent />} />
      <Route index element={<UserProfileContent />} />
    </Routes>
  );
};

const UserProfileContent: React.FC = () => {
  let userId = Number(useParams().id);

  // We always need to get the current user and the viewed profile to check if the current profile page being viewed is the current user (and therefore editable)
  const { data: currUserData, isError: isCurrUserError, isLoading: currUserIsLoading } = useUserInfo();
  const { data: requestedData, error: requestedError, isLoading: requestedIsLoading } = useUserInfo(userId);

  const updateMutation = useUserInfoUpdateMutation();

  const [viewing, setViewing] = useState(true);
  const [showSaveSpinner, setShowSaveSpinner] = useState(false);
  const [validationText, setValidationText] = useState("");

  const [formData, setFormData] = useState<FormUserInfo>({
    preferredName: "",
    bio: "",
    pronouns: "",
    pronunciation: "",
    profileImage: ""
  });
  const [file, setFile] = useState<File | "">("");

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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      if (!["image/png", "image/jpeg"].includes(selectedFile.type)) {
        setValidationText(`File is not a PNG or JPEG.`);
      } else if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
        setValidationText(`Image size exceeds maximum allowed size of ${MAX_SIZE_MB}MB.`);
      } else {
        setFile(selectedFile);
        setValidationText("");
      }
    }
  };

  // Handle file deletion change
  const handleFileDeletion = () => {
    setFile("");
    setFormData(prev => ({ ...prev, profileImage: "" }));
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setShowSaveSpinner(true);

    // Length checks
    if (formData["preferredName"].length > 100) {
      setValidationText("Preferred name is over 100 characters.");
      setShowSaveSpinner(false);
      return;
    } else if (formData["pronouns"].length > 50) {
      setValidationText("Pronouns are over 50 characters.");
      setShowSaveSpinner(false);
      return;
    } else if (formData["pronunciation"].length > 100) {
      setValidationText("Pronounciation is over 100 characters.");
      setShowSaveSpinner(false);
      return;
    } else if (formData["bio"].length > 700) {
      setValidationText("Bio is over 700 characters.");
      setShowSaveSpinner(false);
      return;
    }

    const userInfo = new FormData();
    userInfo.append("id", userId.toString());

    for (const [requestField, formField] of [
      ["preferred_name", "preferredName"],
      ["bio", "bio"],
      ["pronouns", "pronouns"],
      ["pronunciation", "pronunciation"],
      ["profile_image_link", "profileImage"]
    ]) {
      userInfo.append(requestField, formData[formField as keyof FormUserInfo]);
    }

    if (file) {
      userInfo.append("file", file);
    }

    const dataObject: { [key: string]: string } = {};
    userInfo.forEach((value, key) => {
      dataObject[key] = value as string;
    });

    updateMutation.mutate(userInfo, {
      onSuccess: () => {
        setFile("");
        setValidationText("");
        setViewing(true);
        setShowSaveSpinner(false);
      },
      onError: ({ detail }: UpdateUserMutationResponse) => {
        setValidationText(detail);
        setShowSaveSpinner(false);
      }
    });
  };

  // Check if page is editable (current user matches viewed profile)
  const canEdit = currUserData?.id === requestedData?.id || requestedData.isEditable;

  // Toggle edit mode
  const handleEditToggle = () => {
    setFormData({
      preferredName: requestedData.preferredName || "",
      bio: requestedData.bio || "",
      pronouns: requestedData.pronouns || "",
      pronunciation: requestedData.pronunciation || "",
      profileImage: requestedData.profileImage || ""
    });
    setFile("");
    setViewing(false);
  };

  const handleCancelToggle = () => {
    setViewing(true);
  };

  return (
    <div className="user-profile-page">
      <div className="user-profile-main">
        {canEdit && (
          <Tooltip
            placement="bottom"
            source={<InfoIcon className="icon user-tooltip-icon" />}
            className="user-profile-tooltip"
          >
            <div>
              Edit your profile so others can learn about you.
              {requestedData.roles.includes("mentor") ? (
                <>
                  <br />
                  <br />
                  This profile is visible to everyone.
                </>
              ) : requestedData.roles.includes("student") ? (
                <>
                  <br />
                  <br />
                  This profile is visible to your mentors and coordinators.
                </>
              ) : (
                ""
              )}
            </div>
          </Tooltip>
        )}
        {viewing ? (
          <>
            <div className="user-profile-viewing-header">
              <div
                className={
                  "user-profile-item user-profile-image-container" +
                  (requestedData.profileImage?.trim() ? "" : " user-profile-border")
                }
              >
                {requestedData.profileImage?.trim() ? (
                  <img src={requestedData.profileImage} className="user-profile-image" />
                ) : (
                  <LogoNoText id="logo" className="user-profile-image user-profile-placeholder" />
                )}
              </div>
              <div className="user-profile-fields">
                <div className="user-profile-item">
                  <p className="user-profile-text user-profile-name">
                    {requestedData.preferredName}
                    {requestedData.pronouns?.trim() && (
                      <>
                        &nbsp;
                        <small>[{requestedData.pronouns.toLowerCase()}]</small>
                      </>
                    )}
                  </p>
                </div>

                <div className="user-profile-item">
                  {requestedData.pronunciation?.trim() && (
                    <>
                      <p className="user-profile-text user-profile-pronunciation">{requestedData.pronunciation}</p>
                    </>
                  )}
                </div>

                <div className="user-profile-item">
                  <p className="user-profile-text user-profile-email">{requestedData?.email}</p>
                </div>
              </div>
            </div>
            <div className="user-profile-bio">
              {requestedData.bio?.trim() && <p className="user-profile-text">{requestedData.bio}</p>}
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
            <div>
              <div
                className={
                  "user-profile-image-upload-container" +
                  (formData.profileImage?.trim() || file ? "" : " user-profile-border")
                }
              >
                <input
                  type="file"
                  id="image-upload"
                  className="user-profile-image-upload"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="image-upload"
                  className="user-profile-item user-profile-image-container user-profile-image-upload-label"
                >
                  {formData.profileImage?.trim() || file ? (
                    <img
                      src={file ? URL.createObjectURL(file) : formData.profileImage?.trim()}
                      className="user-profile-image user-profile-image-upload-preview"
                    />
                  ) : (
                    <LogoNoText id="logo" className="user-profile-image user-profile-placeholder" />
                  )}
                  <Upload className="user-profile-image-upload-icon" />
                </label>
                {formData.profileImage?.trim() || file ? (
                  <button
                    className="user-profile-clear-image-button"
                    aria-label="Remove profile image"
                    onClick={handleFileDeletion}
                  >
                    <XIcon className="icon" />
                  </button>
                ) : null}
              </div>
            </div>
            <div className="user-profile-input">
              <div className="user-profile-name-label">
                <label htmlFor="preferredName" className="form-label">
                  Preferred&nbsp;Name
                </label>
                <Tooltip
                  placement="top"
                  source={<InfoIcon className="icon user-tooltip-icon" />}
                  className="user-profile-preferred-name-tooltip"
                >
                  <div>
                    A blank name field will default to
                    <br />
                    your first and last name.
                  </div>
                </Tooltip>
              </div>
              <input
                type="text"
                id="preferredName"
                name="preferredName"
                maxLength={100}
                className="form-input user-profile-input-field"
                value={formData.preferredName}
                onChange={handleInputChange}
              />
            </div>
            <div className="user-profile-input">
              <label htmlFor="pronouns" className="form-label">
                Pronouns
              </label>
              <input
                type="text"
                id="pronouns"
                name="pronouns"
                maxLength={50}
                className="form-input user-profile-input-field"
                value={formData.pronouns}
                onChange={handleInputChange}
              />
            </div>
            <div className="user-profile-input">
              <label htmlFor="pronunciation" className="form-label">
                Pronunciation
              </label>
              <input
                type="text"
                id="pronunciation"
                name="pronunciation"
                maxLength={100}
                className="form-input user-profile-input-field"
                value={formData.pronunciation}
                onChange={handleInputChange}
              />
            </div>
            <div className="user-profile-input">
              <label htmlFor="email" className="form-label">
                Email
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
            {validationText !== "" && (
              <div className="create-section-validation-text-container">
                <ExclamationCircle className="icon outline" />
                <span className="create-section-validation-text">{validationText}</span>
              </div>
            )}
            <div className="user-profile-buttons">
              <button className="secondary-btn" onClick={handleCancelToggle}>
                Cancel
              </button>
              <button className="primary-btn" onClick={handleFormSubmit} disabled={showSaveSpinner}>
                {showSaveSpinner ? <LoadingSpinner /> : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserProfile;
