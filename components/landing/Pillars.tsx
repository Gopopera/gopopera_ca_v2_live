import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const Pillars: React.FC = () => {
  const { t } = useLanguage();
  
  const pillars = [
    {
      id: "01",
      title: t('pillars.sellShop.title'),
      category: t('pillars.sellShop.category'),
      description: t('pillars.sellShop.description'),
      image: "/justin-lim-sale.webp",
    },
    {
      id: "02",
      title: t('pillars.connectPromote.title'),
      category: t('pillars.connectPromote.category'),
      description: t('pillars.connectPromote.description'),
      image: "/corey-oconnell-crowd.webp",
    },
    {
      id: "03",
      title: t('pillars.mobilizeSupport.title'),
      category: t('pillars.mobilizeSupport.category'),
      description: t('pillars.mobilizeSupport.description'),
      image: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?q=80&w=2074&auto=format&fit=crop",
    }
  ];

  return (
    <section className="py-6 sm:py-8 md:py-12 lg:py-16 xl:py-20 bg-white relative overflow-hidden w-full lg:w-screen lg:max-w-none lg:mx-0">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10 lg:mb-12">
          <span className="inline-block py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-[#15383c]/5 border border-[#15383c]/10 text-[#e35e25] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-3 sm:mb-4">
            {t('pillars.badge')}
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-5xl font-heading font-bold text-[#15383c] mb-3 sm:mb-4 md:mb-6">
            {t('pillars.title')}
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-500 max-w-2xl mx-auto font-light leading-relaxed px-4">
            {t('pillars.description')}
          </p>
        </div>

        {/* Cards Container - Horizontal scroll on mobile, grid on desktop */}
        <div className="flex md:grid md:grid-cols-3 gap-4 sm:gap-5 md:gap-6 lg:gap-8 overflow-x-auto md:overflow-x-visible pb-6 sm:pb-8 md:pb-0 -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth hide-scrollbar w-full touch-pan-x overscroll-x-contain scroll-pl-4">
          {pillars.map((pillar) => (
            <div 
              key={pillar.id}
              className="group relative h-auto min-h-[360px] sm:min-h-[400px] md:min-h-[420px] lg:h-[480px] xl:h-[540px] min-w-[78vw] sm:min-w-[55vw] md:min-w-[300px] lg:min-w-0 rounded-2xl sm:rounded-[1.5rem] md:rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden shadow-2xl transition-transform duration-500 hover:-translate-y-2 snap-center flex-shrink-0"
            >
              {/* Background Image - No filters, crisp and clean */}
              <img 
                src={pillar.image} 
                alt={pillar.title} 
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110"
                style={{ filter: 'none' }}
                loading="lazy"
              />
              
              {/* Subtle bottom gradient for text readability only - minimal */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none"></div>
              
              {/* Content */}
              <div className="absolute inset-0 p-5 sm:p-6 md:p-7 lg:p-8 flex flex-col justify-end z-20">
                {/* Category Badge - Green background, lighter but noticeable */}
                <span className="inline-block py-1 sm:py-1.5 md:py-2 px-3.5 sm:px-4 md:px-5 rounded-full bg-green-100/60 border border-green-300/40 text-[#15383c] text-[9px] sm:text-[10px] md:text-xs font-bold tracking-[0.2em] uppercase mb-2 sm:mb-2.5 md:mb-3 w-fit shadow-sm">
                  {pillar.category}
                </span>
                
                {/* Title - Popera heading style */}
                <h3 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-heading font-bold mb-3 sm:mb-2.5 md:mb-3 lg:mb-4 leading-[1.2] sm:leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
                  {pillar.title}
                </h3>
                
                {/* Description - High contrast body text */}
                <p className="text-white text-xs sm:text-sm md:text-base lg:text-lg font-sans font-medium leading-[1.5] sm:leading-relaxed mb-3 sm:mb-4 md:mb-5 lg:mb-6 border-l-4 border-[#e35e25] pl-3 sm:pl-3.5 md:pl-4 lg:pl-5 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] bg-black/20 backdrop-blur-sm py-2 sm:py-2 md:py-2.5 pr-2 sm:pr-2.5 rounded-r-lg">
                  {pillar.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
