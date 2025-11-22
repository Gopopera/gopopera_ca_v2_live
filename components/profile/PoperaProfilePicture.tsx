import React from 'react';

interface PoperaProfilePictureProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-12 h-12',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
  xl: 'w-40 h-40',
};

export const PoperaProfilePicture: React.FC<PoperaProfilePictureProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  return (
    <div 
      className={`
        ${sizeClasses[size]} 
        rounded-full 
        bg-[#15383c] 
        flex 
        items-center 
        justify-center 
        ring-4 
        ring-white 
        shadow-lg
        ${className}
      `}
    >
      <div className="w-full h-full rounded-full bg-[#e35e25] flex items-center justify-center">
        <span className="text-white font-bold" style={{ fontSize: size === 'sm' ? '1rem' : size === 'md' ? '2rem' : size === 'lg' ? '2.5rem' : '3rem' }}>
          P
        </span>
      </div>
    </div>
  );
};

