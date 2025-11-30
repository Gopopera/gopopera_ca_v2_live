import React from 'react';
import { MapPin } from 'lucide-react';

interface MockMapProps {
  lat?: number;
  lng?: number;
  address?: string;
  city?: string;
  className?: string;
}

export const MockMap: React.FC<MockMapProps> = ({ 
  lat, 
  lng, 
  address, 
  city,
  className = '' 
}) => {
  const hasCoordinates = lat !== undefined && lng !== undefined;

  // Always use mock map - Google Maps is disabled to prevent errors
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${className}`}>
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Streets Pattern */}
      <div className="absolute inset-0">
        <svg className="w-full h-full opacity-20" viewBox="0 0 400 300" preserveAspectRatio="none">
          {/* Horizontal streets */}
          <line x1="0" y1="100" x2="400" y2="100" stroke="#15383c" strokeWidth="2" />
          <line x1="0" y1="200" x2="400" y2="200" stroke="#15383c" strokeWidth="2" />
          {/* Vertical streets */}
          <line x1="150" y1="0" x2="150" y2="300" stroke="#15383c" strokeWidth="2" />
          <line x1="250" y1="0" x2="250" y2="300" stroke="#15383c" strokeWidth="2" />
        </svg>
      </div>

      {/* Content Overlay */}
      {hasCoordinates ? (
        <div className="absolute inset-0 flex items-center justify-center">
          {/* Marker */}
          <div className="relative z-10">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-[#e35e25] transform -translate-y-1/2">
              <MapPin 
                size={24} 
                className="sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#e35e25]" 
                fill="currentColor"
                stroke="currentColor"
              />
            </div>
            {/* Pulse animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-[#e35e25]/20 rounded-full animate-ping"></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-gray-200/50">
          <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-2 sm:mb-3 text-[#e35e25]">
            <MapPin 
              size={20} 
              className="sm:w-6 sm:h-6 md:hidden text-[#e35e25]/50" 
              fill="currentColor" 
              stroke="currentColor" 
            />
            <MapPin 
              size={32} 
              className="hidden md:block text-[#e35e25]/50" 
              fill="currentColor" 
              stroke="currentColor" 
            />
          </div>
          <p className="font-medium text-xs sm:text-sm md:text-base text-gray-500 px-4 text-center">
            Location coming soon
          </p>
        </div>
      )}

      {/* Watermark */}
      <div className="absolute bottom-2 right-2 text-[8px] text-gray-400/50 font-mono">
        {hasCoordinates ? 'Mock Map' : 'Mock Map'}
      </div>
    </div>
  );
};
