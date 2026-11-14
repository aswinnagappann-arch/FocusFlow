import React from 'react';

interface FocusFlowLogoProps {
  className?: string;
}

export const FocusFlowLogo: React.FC<FocusFlowLogoProps> = ({ className = 'w-7 h-7' }) => {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        width="32"
        height="32"
        rx="8"
        className="fill-gray-900 dark:fill-[#1A1E28]"
      />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="7.5"
        className="stroke-gray-800 dark:stroke-[#2A303F]"
      />
      <path
        d="M11 11H21M11 11V21M11 11L21 21"
        stroke="#8B5CF6"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="11" cy="11" r="2.75" fill="#8B5CF6" />
      <circle cx="21" cy="11" r="2.75" fill="#F3F4F6" />
      <circle cx="11" cy="21" r="2.75" fill="#F3F4F6" />
      <circle cx="21" cy="21" r="2.75" fill="#8B5CF6" />
    </svg>
  );
};
