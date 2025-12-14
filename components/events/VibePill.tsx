import React from 'react';
import { getVibeLabel } from '../../utils/vibes';

interface VibePillProps {
  vibe: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VibePill: React.FC<VibePillProps> = ({ 
  vibe, 
  size = 'md',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full
        bg-white/80 backdrop-blur-sm text-[#15383c]
        border border-gray-200/60
        font-medium shadow-sm
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {getVibeLabel(vibe)}
    </span>
  );
};

interface VibePillListProps {
  vibes: string[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VibePillList: React.FC<VibePillListProps> = ({
  vibes,
  maxVisible,
  size = 'md',
  className = '',
}) => {
  if (!vibes || vibes.length === 0) {
    return null;
  }

  const visibleVibes = maxVisible ? vibes.slice(0, maxVisible) : vibes;
  const remainingCount = maxVisible && vibes.length > maxVisible 
    ? vibes.length - maxVisible 
    : 0;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleVibes.map((vibe, index) => (
        <VibePill key={index} vibe={vibe} size={size} />
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-white/80 backdrop-blur-sm text-gray-600 font-medium border border-gray-200/60 shadow-sm">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};

