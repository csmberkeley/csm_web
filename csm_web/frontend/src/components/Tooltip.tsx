import React, { useState } from "react";

interface TooltipProps {
  className?: string;
  bodyClassName?: string;
  source: React.ReactNode;
  activation: TooltipActivation;
  children: React.ReactChild | React.ReactChild[];
}

enum TooltipActivation {
  Hover,
  Click
}

export const Tooltip = ({ className, bodyClassName, source, activation, children }: TooltipProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = () => {
    if (activation === TooltipActivation.Hover) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (activation === TooltipActivation.Hover) {
      setIsOpen(false);
    }
  };

  return (
    <div className={`tooltip ${className ?? ""}`}>
      <div className="tooltip-source" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {source}
      </div>
      <div className={`tooltip-body ${isOpen ? "open" : ""} ${bodyClassName ?? ""}`}>{children}</div>
    </div>
  );
};

Tooltip.defaultProps = {
  activation: TooltipActivation.Hover
};
