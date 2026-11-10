import React, { useEffect, useRef, useState } from "react";
import {
  useUserInfo,
  useUserInfoUpdateMutation,
  useUserPhotoRemoveMutation,
  useUserPhotoUploadMutation
} from "../utils/queries/base";

import "../css/my-profile.scss";

const NAME_MAX = 50;
const BIO_MAX = 160;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png"];
const PRONOUN_OPTIONS = ["She/her", "He/him", "They/them", "Prefer not to say"];

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const hasChanges = userInfoLoaded && normalizedName !== "" && (textChanged || photoChanged);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // reset so picking the same file again still triggers onChange
    e.target.value = "";
    if (!file) return;

    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError("Photo must be a JPG or PNG.");
      return;
    }
    if (file.size > PHOTO_MAX_BYTES) {
      setPhotoError("Photo must be 5 MB or smaller.");
      return;
    }
    setPhotoError("");
    setPendingPhoto(file);
    setPhotoRemoved(false);
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

    if (!textChanged) return;
    // the backend stores first and last name separately, so split after the first word;
    // only when the name was edited, since the split would rewrite a multi-word first name
    const [firstName, ...rest] = normalizedName.split(" ");
    const nameFields = nameChanged ? { firstName, lastName: rest.join(" ") } : {};
    try {
      await updateUserInfo.mutateAsync({ ...nameFields, pronouns, bio });
    } catch (error) {
      setSaveError((error as Error).message);
    }
  };

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join("");

  return (
    <form className="my-profile" onSubmit={handleSave}>
      <div className="my-profile-header">
        <h2 className="my-profile-title">Edit Profile</h2>
        <button type="submit" className="primary-btn" disabled={!hasChanges || isSaving}>
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </div>

      {saveError && <span className="my-profile-error">{saveError}</span>}

      <div className="my-profile-photo-row">
        {photoUrl ? (
          <img className="my-profile-avatar" src={photoUrl} alt="Profile photo" />
        ) : (
          <div className="my-profile-avatar my-profile-avatar-empty">{initials}</div>
        )}
        <div className="my-profile-photo-info">
          <span className="my-profile-label">Profile photo</span>
          <span className="my-profile-hint">JPG or PNG · Max 5 MB</span>
          <div className="my-profile-photo-actions">
            <button
              type="button"
              className="primary-btn"
              disabled={isSaving}
              onClick={() => fileInputRef.current?.click()}
            >
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
          {photoError && <span className="my-profile-error">{photoError}</span>}
          <input ref={fileInputRef} type="file" accept={PHOTO_TYPES.join(",")} hidden onChange={handlePhotoChange} />
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
  );
};

export default MyProfile;
