import React from 'react';

/**
 * Modern Spinner Animation
 * Uses Tailwind for a smooth, minimal look
 */
const Spinner: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <div
    className={`relative flex items-center justify-center ${className}`}
    style={{ width: size, height: size }}
    aria-label="Lädt..."
  >
    <span className="absolute inset-0 rounded-full border-4 border-green-600 border-t-transparent animate-spin" />
    <span className="absolute inset-0 rounded-full border-4 border-green-100 opacity-30" />
  </div>
);

export default Spinner;
