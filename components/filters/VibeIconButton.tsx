import React from 'react';
import {
  Sparkles, // Creative
  Heart, // Movement
  Users, // Social
  Leaf, // Wellness
  Star, // Spiritual
  GraduationCap, // Learning
  Mountain, // Outdoors
  Search, // Curious
  Target, // Purposeful
  Music, // Music
  UtensilsCrossed, // Food & Drink
  ShoppingBag, // Markets
  Wrench, // Hands-On
  Film, // Performances
  Trophy, // Sports
  Users2, // Community
  BookOpen, // Workshops
  Theater, // Shows
} from 'lucide-react';

interface VibeIconButtonProps {
  vibe: string;
  isActive: boolean;
  onClick: () => void;
}

// Map vibes to icons
const vibeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Creative': Sparkles,
  'Movement': Heart,
  'Social': Users,
  'Wellness': Leaf,
  'Spiritual': Star,
  'Learning': GraduationCap,
  'Outdoors': Mountain,
  'Curious': Search,
  'Purposeful': Target,
  'Music': Music,
  'Food & Drink': UtensilsCrossed,
  'Markets': ShoppingBag,
  'Hands-On': Wrench,
  'Performances': Film,
  'Sports': Trophy,
  'Community': Users2,
  'Workshops': BookOpen,
  'Shows': Theater,
};

export const VibeIconButton: React.FC<VibeIconButtonProps> = ({
  vibe,
  isActive,
  onClick,
}) => {
  const IconComponent = vibeIcons[vibe] || Sparkles;

  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center gap-1.5 flex-shrink-0 touch-manipulation active:scale-[0.95]
        transition-all min-w-[72px] sm:min-w-[80px]
      `}
      aria-label={vibe}
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
          text-xs sm:text-xs font-medium text-center leading-tight whitespace-nowrap
          transition-colors duration-200
          ${isActive ? 'text-[#15383c] font-semibold' : 'text-gray-600'}
        `}
        style={{ lineHeight: '1.2' }}
      >
        {vibe}
      </span>
    </button>
  );
};

