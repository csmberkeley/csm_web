import React, { useEffect, useRef, useState } from "react";
import {
  useUserInfo,
  useUserInfoUpdateMutation,
  useUserPhotoRemoveMutation,
  useUserPhotoUploadMutation
} from "../utils/queries/base";
import useUnsavedChangesWarning from "../utils/useUnsavedChangesWarning";
import Modal from "./Modal";
import PhotoCropper from "./PhotoCropper";

import CameraIcon from "../../static/frontend/img/camera.svg";
import CheckIcon from "../../static/frontend/img/check.svg";

import "../css/my-profile.scss";

const NAME_MAX = 50;
const BIO_MAX = 160;
// limits the chosen photo; only its small crop is uploaded, which the server limits separately
const PHOTO_MAX_MB = 25;
const PHOTO_MAX_BYTES = PHOTO_MAX_MB * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png"];
const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".jfif", ".png"];
const PRONOUN_OPTIONS = ["She/her", "He/him", "They/them", "Prefer not to say"];

// browsers get a file's type from the OS, which on Windows can be blank or unusual;
// this is only a quick check, since the server verifies the actual image
const isAllowedPhoto = (file: File): boolean => {
  const fileName = file.name.toLowerCase();
  return PHOTO_TYPES.includes(file.type) || PHOTO_EXTENSIONS.some(extension => fileName.endsWith(extension));
};

const MyProfile = (): React.ReactElement => {
  const { data: userInfo, isSuccess: userInfoLoaded } = useUserInfo();
  const updateUserInfo = useUserInfoUpdateMutation();
  const uploadPhoto = useUserPhotoUploadMutation();
  const removePhoto = useUserPhotoRemoveMutation();

  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [bio, setBio] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [saveError, setSaveError] = useState("");
  // photo changes wait for "Save changes"; until then they are only previewed
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // a chosen photo waiting to be cropped
  const [cropFile, setCropFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // the save button reads "Changes saved" after a save, until the user edits again
  const [justSaved, setJustSaved] = useState(false);

  const savedName = userInfoLoaded ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : "";
  const savedPhotoUrl = userInfoLoaded ? userInfo.profilePhoto : null;
  const photoUrl = previewUrl ?? (photoRemoved ? null : savedPhotoUrl);
  const isSaving = updateUserInfo.isLoading || uploadPhoto.isLoading || removePhoto.isLoading;

  // fill the form with the logged-in user's saved profile
  useEffect(() => {
    if (userInfoLoaded) {
      setName(savedName);
      setPronouns(userInfo.pronouns);
      setBio(userInfo.bio);
    }
  }, [userInfoLoaded, savedName, userInfo?.pronouns, userInfo?.bio]);

  // show the chosen photo, and free its preview when it changes or the page closes
  useEffect(() => {
    if (!pendingPhoto) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingPhoto);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingPhoto]);

  // compare what the server would store, since it collapses name spacing and trims the bio
  const normalizedName = name.trim().replace(/\s+/g, " ");
  const nameChanged = normalizedName !== savedName.replace(/\s+/g, " ");
  const textChanged = userInfoLoaded && (nameChanged || pronouns !== userInfo.pronouns || bio.trim() !== userInfo.bio);
  const photoChanged = pendingPhoto !== null || photoRemoved;
  const hasUnsavedEdits = userInfoLoaded && (textChanged || photoChanged);
  const hasChanges = hasUnsavedEdits && (normalizedName !== "" || !nameChanged);
  const leaveWarning = useUnsavedChangesWarning(hasUnsavedEdits || isSaving);

  // any new edit turns the button back into "Save changes"
  useEffect(() => {
    if (hasChanges) setJustSaved(false);
  }, [hasChanges]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so picking the same file again still triggers onChange
    e.target.value = "";
    if (!file) return;

    if (!isAllowedPhoto(file)) {
      setPhotoError("Photo must be a JPG or PNG.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError(`Photo must be ${PHOTO_MAX_MB} MB or smaller.`);
      return;
    }
    setPhotoError("");
    setCropFile(file);
  };

  const handleCropConfirm = (cropped: File) => {
    setCropFile(null);
    setPendingPhoto(cropped);
    setPhotoRemoved(false);
  };

  const handleCropError = (message: string) => {
    setCropFile(null);
    setPhotoError(message);
  };

  const handlePhotoRemove = () => {
    setPhotoError("");
    setPendingPhoto(null);
    setPhotoRemoved(savedPhotoUrl !== null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhotoError("");
    setSaveError("");

    // save the photo first, so a rejected file stops the save before anything has changed
    try {
      if (pendingPhoto) {
        await uploadPhoto.mutateAsync(pendingPhoto);
      } else if (photoRemoved) {
        await removePhoto.mutateAsync();
      }
    } catch (error) {
      setPhotoError((error as Error).message);
      return;
    }
    setPendingPhoto(null);
    setPhotoRemoved(false);

    if (!textChanged) {
      setJustSaved(true);
      return;
    }
    // the backend stores first and last name separately, so split after the first word;
    // only when the name was edited, since the split would rewrite a multi-word first name
    const [firstName, ...rest] = normalizedName.split(" ");
    const nameFields = nameChanged ? { firstName, lastName: rest.join(" ") } : {};
    try {
      await updateUserInfo.mutateAsync({ ...nameFields, pronouns, bio });
      setJustSaved(true);
    } catch (error) {
      setSaveError((error as Error).message);
    }
  };

  const openPhotoPicker = () => fileInputRef.current?.click();
  const showSaved = justSaved && !isSaving;

  const unsavedPhotoHint = pendingPhoto
    ? "New photo, not saved yet"
    : photoRemoved
    ? "Photo will be removed when you save"
    : "";

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => Array.from(word)[0].toUpperCase())
    .join("");

  return (
    <>
      <form className="my-profile" onSubmit={handleSave}>
        <div className="my-profile-header">
          <h2 className="my-profile-title">Edit Profile</h2>
          <button
            type="submit"
            className={`primary-btn${showSaved ? " my-profile-saved" : ""}`}
            disabled={!hasChanges || isSaving}
          >
            {showSaved && <CheckIcon className="icon" />}
            {isSaving ? "Saving..." : showSaved ? "Changes saved" : "Save changes"}
          </button>
        </div>

        {userInfoLoaded && (
          <p className="my-profile-account">
            Signed in as <strong>{userInfo.email}</strong>
          </p>
        )}

        {saveError && <span className="my-profile-error">{saveError}</span>}

        <div className="my-profile-photo-row">
          <button
            type="button"
            className="my-profile-avatar-btn"
            aria-label="Change profile photo"
            disabled={isSaving}
            onClick={openPhotoPicker}
          >
            {photoUrl ? (
              <img className="my-profile-avatar" src={photoUrl} alt="" />
            ) : (
              <span className="my-profile-avatar my-profile-avatar-empty">{initials}</span>
            )}
            <span className="my-profile-avatar-overlay">
              <CameraIcon className="icon outline" />
            </span>
          </button>
          <div className="my-profile-photo-info">
            <span className="my-profile-label">Profile photo</span>
            <span className="my-profile-hint">JPG or PNG · Max {PHOTO_MAX_MB} MB</span>
            <div className="my-profile-photo-actions">
              <button type="button" className="primary-btn" disabled={isSaving} onClick={openPhotoPicker}>
                Upload photo
              </button>
              <button
                type="button"
                className="my-profile-outline-btn"
                disabled={!photoUrl || isSaving}
                onClick={handlePhotoRemove}
              >
                Remove
              </button>
            </div>
            {unsavedPhotoHint && (
              <span className="my-profile-unsaved" role="status">
                {unsavedPhotoHint}
              </span>
            )}
            {photoError && <span className="my-profile-error">{photoError}</span>}
            <input
              ref={fileInputRef}
              type="file"
              accept={[...PHOTO_TYPES, ...PHOTO_EXTENSIONS].join(",")}
              hidden
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        <label className="my-profile-field">
          <span className="my-profile-label">Name</span>
          <input
            className="my-profile-input"
            value={name}
            maxLength={NAME_MAX}
            readOnly={isSaving}
            onChange={e => setName(e.target.value)}
          />
          <span className="my-profile-count">
            {name.length}/{NAME_MAX}
          </span>
        </label>

        <label className="my-profile-field">
          <span className="my-profile-label">Pronouns</span>
          <select
            className="my-profile-input"
            value={pronouns}
            disabled={isSaving}
            onChange={e => setPronouns(e.target.value)}
          >
            <option value="">Select pronouns</option>
            {PRONOUN_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="my-profile-field">
          <span className="my-profile-label">Bio</span>
          <textarea
            className="my-profile-input"
            placeholder="Tell us a little about yourself..."
            value={bio}
            maxLength={BIO_MAX}
            readOnly={isSaving}
            onChange={e => setBio(e.target.value)}
          />
          <span className="my-profile-count">
            {bio.length}/{BIO_MAX}
          </span>
        </label>
      </form>

      {cropFile && (
        <PhotoCropper
          file={cropFile}
          onCancel={() => setCropFile(null)}
          onConfirm={handleCropConfirm}
          onError={handleCropError}
        />
      )}

      {leaveWarning.showWarning && (
        <Modal closeModal={leaveWarning.stay}>
          <div className="my-profile-leave">
            <h3 className="my-profile-dialog-title">Leave without saving?</h3>
            <p className="my-profile-leave-text">Your changes on this page haven&apos;t been saved.</p>
            <div className="my-profile-dialog-actions">
              <button type="button" className="my-profile-outline-btn" onClick={leaveWarning.stay}>
                Keep editing
              </button>
              <button type="button" className="danger-btn" onClick={leaveWarning.leave}>
                Leave without saving
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};

export default MyProfile;
