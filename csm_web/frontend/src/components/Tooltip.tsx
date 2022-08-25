import React, { useState } from "react";

interface TooltipProps {
  className?: string;
  bodyClassName?: string;
  source: React.ReactNode;
  activation: TooltipActivation;
  children: React.ReactChild | React.ReactChild[];
  placement: "top" | "bottom" | "left" | "right";
}

enum TooltipActivation {
  Hover,
  Click
}

export const Tooltip = ({ className, bodyClassName, source, activation, placement, children }: TooltipProps) => {
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

  let top, left, transform;

  switch (placement) {
    case "top":
      top = "0";
      left = "50%";
      transform = "translate(-50%, -100%)";
      break;
    case "bottom":
      top = "100%";
      left = "50%";
      transform = "translate(-50%, 0)";
      break;
    case "left":
      top = "50%";
      left = "0";
      transform = "translate(-100%, -50%)";
      break;
    case "right":
      top = "50%";
      left = "100%";
      transform = "translate(0, -50%)";
      break;
  }

  return (
    <div className={`tooltip ${className ?? ""}`}>
      <div className="tooltip-source" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {source}
      </div>
      <div
        className={`tooltip-body top ${isOpen ? "open" : ""} ${bodyClassName ?? ""}`}
        style={{
          top: top,
          left: left,
          transform: transform
        }}
      >
        {children}
      </div>
    </div>
  );
};

Tooltip.defaultProps = {
  activation: TooltipActivation.Hover
};
