import React, { useEffect, useRef, useState } from "react";
import { useUserInfo, useUserInfoUpdateMutation } from "../utils/queries/base";

import "../css/my-profile.scss";

const NAME_MAX = 50;
const PRONOUNS_MAX = 50;
const BIO_MAX = 160;
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png"];
const PRONOUN_OPTIONS = ["She/her", "He/him", "They/them", "Prefer not to say"];

const MyProfile = (): React.ReactElement => {
  const { data: userInfo, isSuccess: userInfoLoaded } = useUserInfo();
  const updateUserInfo = useUserInfoUpdateMutation();

  const [name, setName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savedName = userInfoLoaded ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : "";

  // fill the form with the logged-in user's saved profile
  useEffect(() => {
    if (userInfoLoaded) {
      setName(savedName);
      setPronouns(userInfo.pronouns);
      setBio(userInfo.bio);
    }
  }, [userInfoLoaded, userInfo]);

  // free the previous preview whenever the photo changes or the page closes
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  const hasChanges =
    userInfoLoaded && (name.trim() !== savedName || pronouns !== userInfo.pronouns || bio !== userInfo.bio);

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
    setPhotoUrl(URL.createObjectURL(file));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // the backend stores first and last name separately, so split after the first word
    const [firstName, ...rest] = name.trim().split(/\s+/);
    updateUserInfo.mutate({
      firstName,
      lastName: rest.join(" "),
      pronouns,
      bio
    });
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
        <button type="submit" className="primary-btn" disabled={!hasChanges || updateUserInfo.isLoading}>
          {updateUserInfo.isLoading ? "Saving..." : "Save changes"}
        </button>
      </div>

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
            <button type="button" className="primary-btn" onClick={() => fileInputRef.current?.click()}>
              Upload photo
            </button>
            <button
              type="button"
              className="my-profile-outline-btn"
              disabled={!photoUrl}
              onClick={() => setPhotoUrl(null)}
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
        <input className="my-profile-input" value={name} maxLength={NAME_MAX} onChange={e => setName(e.target.value)} />
        <span className="my-profile-count">
          {name.length}/{NAME_MAX}
        </span>
      </label>

      <label className="my-profile-field">
        <span className="my-profile-label">Pronouns</span>
        <select className="my-profile-input" value={pronouns} onChange={e => setPronouns(e.target.value)}>
          <option value="">Select pronouns</option>
          {PRONOUN_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="my-profile-count">
          {pronouns.length}/{PRONOUNS_MAX}
        </span>
      </label>

      <label className="my-profile-field">
        <span className="my-profile-label">Bio</span>
        <textarea
          className="my-profile-input"
          placeholder="Tell us a little about yourself..."
          value={bio}
          maxLength={BIO_MAX}
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
