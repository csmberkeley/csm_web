import React from "react";

import SearchIcon from "../../static/frontend/img/search.svg";

interface SearchBarProps {
  className?: string;
  ref?: React.RefObject<HTMLInputElement>;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
}

export const SearchBar = ({ className, ref, onChange }: SearchBarProps) => {
  return (
    <div className={`search-bar ${className ?? ""}`}>
      <SearchIcon className="search-icon" />
      <input className="search-input" type="text" ref={ref} onChange={onChange} />
    </div>
  );
};
