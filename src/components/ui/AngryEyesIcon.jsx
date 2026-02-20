import React from 'react';

export const AngryEyesIcon = ({ size = 24, className = '', style = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 453 298"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Left eye - angular shape with inward curve at bottom */}
      <path
        d="M 49 48 L 172 138 L 172 233 Q 140 245 120 298 L 49 298 Z"
        fill="currentColor"
      />
      
      {/* Right eye - triangular shape */}
      <path
        d="M 222 156 L 440 285 L 440 298 L 222 298 Z"
        fill="currentColor"
      />
    </svg>
  );
};
