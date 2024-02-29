import React, { LabelHTMLAttributes, useState } from "react";
const Table = () => {
  return (
    <table>
      <tbody>
        <OutputTableRow id={1} fullname="John Doe" email="john@example.com" mentorname="Mentor" absences={3} />
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
        <Checkbox label={1} onChange={handleCheckboxChange} />
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
      {label}
    </label>
  );
};
