import React from "react";

import SearchIcon from "../../../static/frontend/img/search.svg";

interface SearchBarProps {
  refObject?: React.RefObject<HTMLInputElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export const SearchBar = ({ refObject, onChange }: SearchBarProps) => {
  return (
    <div className="search-bar search-filter">
      <SearchIcon className="search-icon" />
      <input
        id="search-filter"
        placeholder="Search for Names or Emails..."
        className="search-input"
        type="text"
        ref={refObject}
        onChange={onChange}
      />
    </div>
  );
};
