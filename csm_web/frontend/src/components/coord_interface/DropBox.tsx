import React from "react";
import { Mentor, Student } from "../../utils/queries/coord";

interface DropBoxProps {
  items: Array<string>;
  name: string;
  field: keyof Mentor | keyof Student;
  func: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, field: keyof Mentor | keyof Student) => void;
  reset: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export default function DropBox({ name, items, func, field, reset }: DropBoxProps) {
  return (
    <div className="dropdown">
      <button className="dropbtn" onClick={event => reset(event)}>
        {name}
        <div></div>
      </button>
      <div className="dropdown-content">
        {items.map(item => (
          <button onClick={event => func(event, field)} key={item}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
