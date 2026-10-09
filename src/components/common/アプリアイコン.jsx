import React from 'react';

export const WithFitLogo = ({ className = "", size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="7" cy="12" r="3" />
    <circle cx="17" cy="12" r="3" />
    <line x1="10" y1="12" x2="14" y2="12" />
    <path d="M4 12a8 8 0 0 1 16 0" strokeOpacity="0.5" />
  </svg>
);
