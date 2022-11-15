import React, { useState, useEffect, ChangeEvent, MouseEvent } from "react";

interface SearchRowProps {
  name: string;
  email: string;
  id: string;
}

export const SearchRow = ({ name, email, id }: SearchRowProps): React.ReactElement => {
  return (
    <div>
      {name} {email} {id}
      <button> I do Nothing</button>
    </div>
  );
};
