import React from "react";

interface DropBoxProps {
  items: Array<string>;
  name: string;
  func: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
}

export default function DropBox({ name, items, func }: DropBoxProps) {
  return (
    <div className="dropdown">
      <button className="dropbtn">
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
