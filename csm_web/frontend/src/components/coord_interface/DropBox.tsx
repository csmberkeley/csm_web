import React from "react";

interface DropBoxProps {
  items: Array<string>;
  name: string;
  func: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  reset: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export default function DropBox({ name, items, func, reset }: DropBoxProps) {
  return (
    <div className="dropdown">
      <button className="dropbtn" onClick={event => reset(event)}>
        {name}
        <div></div>
      </button>
      <div className="dropdown-content">
        {items.map(item => (
          <button onClick={event => func(event)} key={item}>
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
