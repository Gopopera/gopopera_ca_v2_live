import React from 'react';
import {
  Grid3x3,
  Users,
  Music,
  GraduationCap,
  ShoppingBag,
  Trophy,
  Heart,
  Film,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';

interface CategoryIconButtonProps {
  category: string; // Can be English key or translated name
  categoryKey?: string; // Optional: original English key for icon mapping
  isActive: boolean;
  onClick: () => void;
}

// Map English category keys to icons
const categoryIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'All': Grid3x3,
  'Community': Users,
  'Music': Music,
  'Workshops': GraduationCap,
  'Markets': ShoppingBag,
  'Sports': Trophy,
  'Social': Heart,
  'Shows': Film,
  'Food & Drink': UtensilsCrossed,
  'Wellness': Sparkles,
};

// Map translated category names back to English keys for icon lookup
const translatedToKey: Record<string, string> = {
  // English (already keys)
  'All': 'All',
  'Community': 'Community',
  'Music': 'Music',
  'Workshops': 'Workshops',
  'Markets': 'Markets',
  'Sports': 'Sports',
  'Social': 'Social',
  'Shows': 'Shows',
  'Food & Drink': 'Food & Drink',
  'Wellness': 'Wellness',
  // French translations
  'Tout': 'All',
  'Communauté': 'Community',
  'Musique': 'Music',
  'Ateliers': 'Workshops',
  'Marchés': 'Markets',
  'Spectacles': 'Shows',
  'Nourriture & Boissons': 'Food & Drink',
  'Bien-être': 'Wellness',
};

// Get English key from category (handles both English and translated)
const getCategoryKey = (category: string, providedKey?: string): string => {
  if (providedKey) return providedKey;
  return translatedToKey[category] || category;
};

export const CategoryIconButton: React.FC<CategoryIconButtonProps> = ({
  category,
  categoryKey,
  isActive,
  onClick,
}) => {
  const key = getCategoryKey(category, categoryKey);
  const IconComponent = categoryIcons[key] || Grid3x3;

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1.5 flex-shrink-0 touch-manipulation active:scale-[0.95]
        transition-all min-w-[64px] max-w-[64px] sm:min-w-[72px] sm:max-w-[72px]
      `}
      aria-label={category}
    >
      {/* Circular Icon Container */}
      <div
        className={`
          w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
          transition-all duration-200
          ${isActive
            ? 'bg-[#15383c] text-white shadow-lg shadow-teal-900/20'
            : 'bg-white border-2 border-gray-200 text-gray-600 hover:border-[#e35e25] hover:text-[#e35e25]'
          }
        `}
      >
        <IconComponent size={isActive ? 22 : 20} className={isActive ? 'text-white' : 'text-current'} />
      </div>

      {/* Label */}
      <span
        className={`
          text-xs sm:text-xs font-medium text-center leading-tight
          transition-colors duration-200
          ${isActive ? 'text-[#15383c] font-semibold' : 'text-gray-600'}
        `}
      >
        {category}
      </span>
    </button>
  );
};

