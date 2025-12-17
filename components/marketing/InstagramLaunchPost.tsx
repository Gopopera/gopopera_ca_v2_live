/**
 * Instagram Launch Post - Marketing Asset
 * Format: 1080 × 1350 (portrait IG post)
 * 
 * This is a static single-image post for Instagram launch.
 * To export: Open this component in browser and take a screenshot at 1080x1350
 * Or use a tool like html2canvas to export as PNG.
 */

import React from 'react';

// Popera Logo Component (matches existing brand)
const PoperaLogo = () => (
  <div className="flex items-center gap-2">
    <div className="w-10 h-10 bg-[#e35e25] rounded-xl flex items-center justify-center">
      <span className="text-white font-bold text-xl font-heading">P</span>
    </div>
    <span className="text-[#f2f2f2] font-heading font-bold text-2xl tracking-tight">
      Popera<span className="text-[#e35e25]">.</span>
    </span>
  </div>
);

// Small Event Card (optional product hint)
const MiniEventCard = () => (
  <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-3 shadow-xl shadow-black/20 w-48">
    {/* Event Image placeholder */}
    <div className="w-full h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl mb-2 flex items-center justify-center">
      <span className="text-2xl">🥖</span>
    </div>
    <h4 className="text-[#15383c] font-semibold text-sm leading-tight">Sourdough & Stories</h4>
    <p className="text-gray-500 text-xs mt-0.5">Tonight · 7 PM · 6 spots</p>
    <div className="mt-2">
      <span className="inline-block bg-[#e35e25] text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
        Circle · Montréal
      </span>
    </div>
  </div>
);

// Descriptive Chip/Pill
const DescriptiveChip = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white/95 backdrop-blur-sm text-[#15383c] px-4 py-2 rounded-full text-sm font-medium shadow-lg shadow-black/10">
    {children}
  </div>
);

export const InstagramLaunchPost: React.FC = () => {
  return (
    <div 
      className="relative overflow-hidden font-sans"
      style={{ 
        width: '1080px', 
        height: '1350px',
        fontFamily: "'Outfit', 'Inter', system-ui, sans-serif"
      }}
    >
      {/* Background Image - Social gathering */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80')`,
          // Alternative images you can use:
          // Friends at dinner: https://images.unsplash.com/photo-1543269865-cbf427effbad?w=1200&q=80
          // Diverse group cooking: https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=1200&q=80
          // Cozy cafe gathering: https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1200&q=80
        }}
      />
      
      {/* Dark green gradient overlay for readability */}
      <div 
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            180deg, 
            rgba(21, 56, 60, 0.85) 0%, 
            rgba(21, 56, 60, 0.65) 30%,
            rgba(21, 56, 60, 0.55) 50%,
            rgba(21, 56, 60, 0.70) 75%,
            rgba(21, 56, 60, 0.90) 100%
          )`
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 h-full flex flex-col items-center justify-between py-16 px-12">
        
        {/* Top Section - Logo & Badge */}
        <div className="flex flex-col items-center">
          <PoperaLogo />
          
          {/* Category Badge */}
          <div className="mt-6">
            <span className="inline-block bg-[#e35e25] text-white text-sm font-semibold px-5 py-2 rounded-full tracking-wide uppercase">
              Peer-to-Peer Social Circles
            </span>
          </div>
        </div>

        {/* Middle Section - Main Headline */}
        <div className="text-center flex-1 flex flex-col items-center justify-center -mt-8">
          {/* Main Headline */}
          <h1 
            className="text-[#f2f2f2] font-heading font-bold leading-[1.1] text-center mb-6"
            style={{ fontSize: '72px' }}
          >
            Find small in-person<br />
            social circles near you.
          </h1>
          
          {/* Subheadline */}
          <p 
            className="text-[#f2f2f2]/85 font-normal text-center max-w-xl leading-relaxed"
            style={{ fontSize: '26px' }}
          >
            Join 3–10 person circles to meet people<br />
            in your city — or start your own.
          </p>
        </div>

        {/* Bottom Section - Chips & Optional Event Card */}
        <div className="flex flex-col items-center gap-8">
          
          {/* Optional: Mini Event Card - positioned slightly to the right */}
          <div className="absolute bottom-48 right-16">
            <MiniEventCard />
          </div>
          
          {/* Descriptive Chips */}
          <div className="flex items-center gap-4">
            <DescriptiveChip>🍳 Cook together</DescriptiveChip>
            <DescriptiveChip>📚 Learn something new</DescriptiveChip>
            <DescriptiveChip>👋 Meet your neighbors</DescriptiveChip>
          </div>
        </div>
      </div>
    </div>
  );
};

// Export page wrapper for viewing/exporting
export const InstagramLaunchPostPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div className="shadow-2xl">
        <InstagramLaunchPost />
      </div>
    </div>
  );
};

export default InstagramLaunchPost;

