import React from "react";

interface EmailOptionProps {
    // popText: string;                // this should be the change for the check perhaps?
    name: string; 
    showTemp: () => void; //templete
}

export default function EmailOption({ name, showTemp}: EmailOptionProps) {
  return (
    <button onClick={showTemp}>
      <text id={name}> {name}</text>
    </button>
  );
}