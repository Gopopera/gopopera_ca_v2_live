import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  type AnyVibe,
  type EventVibe,
  getVibeLabel,
  normalizeLegacyVibes,
} from '../../src/constants/vibes';

interface VibePillProps {
  vibe: AnyVibe;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const VibePill: React.FC<VibePillProps> = ({ 
  vibe, 
  size = 'md',
  className = '' 
}) => {
  const { language } = useLanguage();
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  // Get the localized label
  const label = getVibeLabel(vibe, language);
  
  // Check if it's a custom vibe
  const isCustom = typeof vibe === 'object' && vibe.isCustom;

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
      {label}
      {isCustom && <span className="ml-0.5 text-[8px] opacity-60">✨</span>}
    </span>
  );
};

interface VibePillListProps {
  vibes: (EventVibe | string)[];
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

  // Normalize legacy vibes for rendering
  const normalizedVibes = normalizeLegacyVibes(vibes);
  const visibleVibes = maxVisible ? normalizedVibes.slice(0, maxVisible) : normalizedVibes;
  const remainingCount = maxVisible && normalizedVibes.length > maxVisible 
    ? normalizedVibes.length - maxVisible 
    : 0;

  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {visibleVibes.map((vibe, index) => (
        <VibePill key={vibe.key || index} vibe={vibe} size={size} />
      ))}
      {remainingCount > 0 && (
        <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs bg-white/80 backdrop-blur-sm text-gray-600 font-medium border border-gray-200/60 shadow-sm">
          +{remainingCount}
        </span>
      )}
    </div>
  );
};
