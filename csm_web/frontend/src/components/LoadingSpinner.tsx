import React from "react";

interface LoadingSpinnerProps {
  id: string;
}

export default function LoadingSpinner({ id }: LoadingSpinnerProps): JSX.Element {
  return (
    <div className="sk-fading-circle" id={id}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className={`sk-circle${i + 1} sk-circle`} />
      ))}
    </div>
  );
}
