import React from 'react';

export const ProteinIcon = ({ size = 24, className = '', style = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {/* Bottle cap */}
      <rect x="8" y="2" width="8" height="2" rx="1" />
      <line x1="9" y1="3" x2="9" y2="2" />
      <line x1="12" y1="3" x2="12" y2="2" />
      <line x1="15" y1="3" x2="15" y2="2" />
      
      {/* Bottle neck */}
      <path d="M8 4 L7 6 L7 8" />
      <path d="M16 4 L17 6 L17 8" />
      
      {/* Bottle body */}
      <path d="M7 8 C7 8, 6 9, 6 10 L6 19 C6 20.5, 7 21, 8 21 L16 21 C17 21, 18 20.5, 18 19 L18 10 C18 9, 17 8, 17 8" />
      
      {/* Label on bottle */}
      <rect x="8" y="11" width="8" height="4" rx="1" />
      
      {/* Scoop */}
      <circle cx="16" cy="17" r="3.5" />
      <path d="M19 17 L22 17" />
      <line x1="16" y1="15" x2="16" y2="16" />
      <line x1="14.5" y1="16" x2="14.5" y2="17" />
      <line x1="17.5" y1="16" x2="17.5" y2="17" />
    </svg>
  );
};
