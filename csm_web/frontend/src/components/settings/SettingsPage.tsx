import React, { useState } from "react";
import { useProfiles } from "../../utils/queries/base";
import { Role } from "../../utils/types";
import LoadingSpinner from "../LoadingSpinner";
// import "../../static/frontend/scss/export.scss";

export type SettingsCategory = "Affinity Section Tags" | null;

// Sidebar Component for selecting settings category
const SettingsSelector = ({
  onSelect,
  selectedCategory,
  className = ""
}: {
  onSelect: (category: SettingsCategory) => void;
  selectedCategory: SettingsCategory;
  className?: string;
}) => {
  return (
    <div className={`settings-sidebar ${className}`}>
      <div className="export-selector-data-type-label">
        {["Affinity Section Tags"].map(category => (
          <div
            key={category}
            className={`export-selector-data-type-label ${selectedCategory === category ? "active" : ""}`}
            onClick={() => onSelect(category as SettingsCategory)}
          >
            {category}
          </div>
        ))}
      </div>
    </div>
  );
};

// SettingsPage Component
export const SettingsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState<SettingsCategory>(null);
  const { data: profiles, isSuccess: profilesLoaded, isError: profilesError } = useProfiles();

  if (profilesError) {
    return <b>Error loading user profiles.</b>;
  } else if (!profilesLoaded) {
    return <LoadingSpinner className="spinner-centered" />;
  } else if (profilesLoaded && !profiles.some(profile => profile.role === Role.COORDINATOR)) {
    return <b>Permission denied; you are not a coordinator for any course.</b>;
  }

  return (
    <div className="data-export-container">
      <div className="data-export-header">
        <h2 className="data-export-page-title">Settings</h2>
      </div>

      <div className="data-export-body">
        {/* LEFT COLUMN (sidebar) */}
        <div className="data-export-sidebar">
          <div className="export-page-sidebar-container">
            {" "}
            {/* Optional for centering */}
            <SettingsSelector
              onSelect={setSelectedCategory}
              selectedCategory={selectedCategory}
              className="export-selector-data-type-label"
            />
          </div>
        </div>

        {/* RIGHT COLUMN (content) */}
        <div className="settings-content">
          {selectedCategory === null ? (
            <div>Select a setting to edit.</div>
          ) : (
            <SettingsContent category={selectedCategory} />
          )}
        </div>
      </div>
    </div>
  );
};

// Component to dynamically display content based on selected category
const SettingsContent = ({ category }: { category: SettingsCategory }) => {
  return (
    <div>
      <h3>{category?.charAt(0).toUpperCase() + category?.slice(1)} Settings</h3>
      <p>Settings for {category} goes here...</p>
    </div>
  );
};
