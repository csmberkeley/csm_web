import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { PermissionError } from "../utils/queries/helpers";
import { useUserInfo, useUserInfoUpdateMutation } from "../utils/queries/profiles";
import { ChangeableUserInfo, RawUserInfo } from "../utils/types";
import LoadingSpinner from "./LoadingSpinner";
import { Tooltip } from "./Tooltip";
import ExclamationCircle from "../../static/frontend/img/exclamation-circle.svg";
import InfoIcon from "../../static/frontend/img/info.svg";
import LogoNoText from "../../static/frontend/img/logo_no_text.svg";
import Upload from "../../static/frontend/img/upload.svg";

import "../css/base/form.scss";
import "../css/base/table.scss";
import "../css/profile.scss";

const MAX_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

const UserProfile: React.FC = () => {
  let userId = Number(useParams().id);

  // We always need to get the current user and the viewed profile to check if the current profile page being viewed is the current user (and therefore editable)
  const { data: currUserData, isError: isCurrUserError, isLoading: currUserIsLoading } = useUserInfo();
  const { data: requestedData, error: requestedError, isLoading: requestedIsLoading } = useUserInfo(userId);

  const updateMutation = useUserInfoUpdateMutation();

  const [viewing, setViewing] = useState(true);
  const [showSaveSpinner, setShowSaveSpinner] = useState(false);
  const [validationText, setValidationText] = useState("");

  const [formData, setFormData] = useState<ChangeableUserInfo>({
    preferredName: "",
    bio: "",
    pronouns: "",
    pronunciation: ""
  });
  const [imageLink, setImageLink] = useState<string | undefined>("");
  const [file, setFile] = useState<File | null>(null);

  // Populate form data with fetched user data
  useEffect(() => {
    if (requestedData) {
      setFormData({
        preferredName: requestedData.preferredName || "",
        bio: requestedData.bio || "",
        pronouns: requestedData.pronouns || "",
        pronunciation: requestedData.pronunciation || ""
      });
      setImageLink(requestedData.profileImage);
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
        setValidationText(`File size exceeds max limit of ${MAX_SIZE_MB}MB.`);
      } else {
        setFile(selectedFile);
        setValidationText("");
      }
    }
  };

  // Handle form submission
  const handleFormSubmit = () => {
    setShowSaveSpinner(true);

    const userInfo = new FormData();
    userInfo.append("id", userId.toString());

    for (const field of ["preferredName", "bio", "pronouns", "pronunciation"] as (keyof ChangeableUserInfo)[]) {
      userInfo.append(field, formData[field]);
    }

    if (file) {
      userInfo.append("file", file);
    }

    updateMutation.mutate(userInfo, {
      onSuccess: (data: RawUserInfo) => {
        console.log(data.profileImage);
        setImageLink(data.profileImage);
        setViewing(true); // Exit edit mode after successful save
        console.log("Profile updated successfully");
        setShowSaveSpinner(false);
      },
      onError: () => {
        setValidationText("Error occurred on save.");
        setShowSaveSpinner(false);
      }
    });
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
              <div
                className={
                  "user-profile-item user-profile-image-container" + (imageLink?.trim() ? "" : " user-profile-border")
                }
              >
                {imageLink?.trim() ? (
                  <img src={imageLink} className="user-profile-image" />
                ) : (
                  <LogoNoText id="logo" className="user-profile-image user-profile-placeholder" />
                )}
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
            <div>
              <div
                className={
                  "user-profile-image-upload-container" + (imageLink?.trim() || file ? "" : " user-profile-border")
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
                  {imageLink?.trim() || file ? (
                    <img src={file ? URL.createObjectURL(file) : imageLink?.trim()} className="user-profile-image" />
                  ) : (
                    <LogoNoText id="logo" className="user-profile-image user-profile-placeholder" />
                  )}
                  <Upload className="user-profile-image-upload-icon" />
                </label>
              </div>
            </div>
            {/* <div className="user-profile-item user-profile-image-container">
              {formData.profileImage?.trim() ? <img src={formData.profileImage} /> : <LogoNoText id="logo" />}
            </div> */}
            {/* {!viewing && <ImageUploader />} */}
            <div className="user-profile-input">
              <div className="user-profile-name-label">
                <label htmlFor="preferredName" className="form-label">
                  Preferred&nbsp;Name
                </label>
                <Tooltip placement="top" source={<InfoIcon className="icon" />} className="user-profile-tooltip">
                  <div>
                    A blank name field will default to
                    <br />
                    the user&apos;s first and last name.
                  </div>
                </Tooltip>
              </div>
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
                Pronouns
              </label>
              <input
                type="text"
                id="pronouns"
                name="pronouns"
                maxLength={20}
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
                maxLength={50}
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
              <button className="primary-btn" onClick={handleCancelToggle}>
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
