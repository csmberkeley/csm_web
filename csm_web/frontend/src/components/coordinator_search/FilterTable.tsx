import React, { useState } from "react";
import "../../css/filtertable.scss";
export const FilterTable = () => {
  return (
    <table className="filtered-table">
      <thead>
        <tr>
          <th>Select</th>
          <th>Full Name</th>
          <th>Email</th>
          <th>Mentor Name</th>
          <th>Absences</th>
        </tr>
      </thead>
      <tbody>
        <OutputTableRow id={1} fullname="John Doe" email="john@example.com" mentorname="Bob The Builder" absences={3} />
      </tbody>
    </table>
  );
};
const OutputTableRow = ({
  id,
  fullname,
  email,
  mentorname,
  absences
}: {
  id: number;
  fullname: string;
  email: string;
  mentorname: string;
  absences: number;
}) => {
  const handleCheckboxChange = (isChecked: boolean) => {
    // Handle checkbox change if needed
    console.log(`Checkbox ${id} is now ${isChecked ? "checked" : "unchecked"}`);
  };
  return (
    <tr>
      <td>
        <Checkbox label={id} onChange={handleCheckboxChange} />
      </td>
      <td>{fullname}</td>
      <td>{email}</td>
      <td>{mentorname}</td>
      <td> {absences} </td>
    </tr>
  );
};
const Checkbox = ({ label, onChange }: { label: number; onChange: (isChecked: boolean) => void }) => {
  const [isChecked, setChecked] = useState(false);

  const handleCheckboxChange = () => {
    setChecked(!isChecked);
    onChange(!isChecked);
  };

  return (
    <label>
      <input type="checkbox" checked={isChecked} onChange={handleCheckboxChange} />
    </label>
  );
};
