import React, { useEffect, useState } from 'react';
import { ViewState } from '../../../types';

interface StickyCTAProps {
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
  primaryText: string;
  secondaryText: string;
}

/**
 * StickyCTA - Mobile sticky CTA bar that appears after 30% scroll
 */
export const StickyCTA: React.FC<StickyCTAProps> = ({
  onPrimaryClick,
  onSecondaryClick,
  primaryText,
  secondaryText,
}) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPercentage =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      setShow(scrollPercentage > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl px-4 py-3 safe-area-bottom">
      <div className="flex gap-3 max-w-md mx-auto">
        <button
          onClick={onPrimaryClick}
          className="flex-1 bg-[#e35e25] text-white rounded-full py-3 px-4 font-bold text-sm hover:bg-[#cf4d1d] transition-colors touch-manipulation active:scale-[0.98]"
        >
          {primaryText}
        </button>
        <button
          onClick={onSecondaryClick}
          className="flex-1 border-2 border-[#15383c] text-[#15383c] rounded-full py-3 px-4 font-bold text-sm hover:bg-[#15383c] hover:text-white transition-colors touch-manipulation active:scale-[0.98]"
        >
          {secondaryText}
        </button>
      </div>
    </div>
  );
};

