import React from "react";

interface LoadingSpinnerProps {
  id?: string;
  className?: string;
}

export default function LoadingSpinner({ id, className }: LoadingSpinnerProps): React.ReactElement {
  return (
    <div className={`sk-fading-circle ${className ?? ""}`} id={id}>
      {[...Array(12)].map((_, i) => (
        <div key={i} className={`sk-circle${i + 1} sk-circle`} />
      ))}
    </div>
  );
}
