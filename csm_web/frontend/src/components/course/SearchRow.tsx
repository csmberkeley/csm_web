import React, { useState, useEffect, ChangeEvent, MouseEvent } from "react";

interface SearchRowProps {
  name: string;
  email: string;
  id: string;
}

export const SearchRow = ({ name, email, id }: SearchRowProps): React.ReactElement => {
  return (
    <div className="SearchRowFormat">
      <div className="SearchRowElem">{name}</div>
      <div className="SearchRowElem">{email}</div>
      <div className="SearchRowElem">{id}</div>
      <button className="SearchButton"> Additional Information</button>
    </div>
  );
};
